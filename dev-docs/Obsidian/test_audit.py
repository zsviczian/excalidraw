"""Purpose: regression checks for the local inventory checker, not Excalidraw.
Author: zsviczian fork-maintenance tooling. Reference: README.md / audit.py.
Notes: synthetic local fixtures only; no dependencies, network, or plugin runtime.
"""
import copy
import importlib.util
from pathlib import Path
import tempfile
import shutil
import subprocess
import sys
import json
import warnings
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("obsidian_audit", Path(__file__).with_name("audit.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AuditTests(unittest.TestCase):
    """Keep file-coverage checks independent of the production repository state."""

    def setUp(self):
        """Construct unmarked, binary, empty, and absent source changes."""
        self.upstream = {"package.json": audit.digest(b"{}"), "a.ts": audit.digest(b"upstream"),
                         "gone.txt": audit.digest(b"old"), "same.txt": audit.digest(b"same")}
        self.fork = {"package.json": audit.digest(b"{}"), "a.ts": audit.digest(b"unmarked change"),
                     "binary.dat": audit.digest(b"\x00\xff"), "empty": audit.digest(b""),
                     "same.txt": audit.digest(b"same")}
        self.manifest = {"schema_version": 1, "customizations": [{"id": "OBS-001"}],
                         "comparison": {"fork": audit.tree_info(self.fork), "upstream": audit.tree_info(self.upstream)},
                         "files": [dict(row, ids=["OBS-001"], note="Reviewed fixture", kind="test")
                                   for row in audit.compare(self.fork, self.upstream)]}

    def test_complete_delta(self):
        """No marker search is needed for full source coverage."""
        rows = {row["path"]: row["status"] for row in self.manifest["files"]}
        self.assertEqual(rows, {"a.ts": "modified", "binary.dat": "fork-only", "empty": "fork-only", "gone.txt": "upstream-only"})
        self.assertEqual(audit.check(self.manifest, self.fork, self.upstream), [])

    def test_new_change_and_retirement_are_flagged(self):
        """New and newly equal files require a fresh semantic review."""
        changed = dict(self.fork, **{"fresh.ts": audit.digest(b"new"), "a.ts": self.upstream["a.ts"]})
        findings = audit.check(self.manifest, changed, self.upstream)
        self.assertTrue(any("UNREVIEWED" in item and "fresh.ts" in item for item in findings))
        self.assertTrue(any("NO LONGER DIFFERS" in item and "a.ts" in item for item in findings))

    def test_content_drift(self):
        """A known path is not automatically approved after an edit."""
        changed = dict(self.fork, **{"a.ts": audit.digest(b"another edit")})
        self.assertTrue(any("CONTENT/STATUS DRIFT" in item for item in audit.check(self.manifest, changed, self.upstream)))

    def test_equal_changes_still_update_provenance(self):
        """Moving both snapshots equally must not leave stale provenance unnoticed."""
        changed_f = dict(self.fork, **{"same.txt": audit.digest(b"both new")})
        changed_u = dict(self.upstream, **{"same.txt": audit.digest(b"both new")})
        self.assertEqual(len(audit.check(self.manifest, changed_f, changed_u)), 2)

    def test_invalid_classification(self):
        """Missing or unknown IDs cannot pass as reviewed entries."""
        invalid = copy.deepcopy(self.manifest)
        invalid["files"][0]["ids"] = ["UNKNOWN"]
        with self.assertRaises(ValueError):
            audit.validate_manifest(invalid)

    def test_duplicate_path(self):
        """Duplicate ledger entries are errors rather than silent overwrites."""
        invalid = copy.deepcopy(self.manifest)
        invalid["files"].append(invalid["files"][0])
        with self.assertRaises(ValueError):
            audit.validate_manifest(invalid)

    def test_directory_and_prefixed_zip_match(self):
        """The delivered policy edits count, but inventory documents exclude themselves."""
        with tempfile.TemporaryDirectory() as name:
            root = Path(name) / "repo"
            root.mkdir()
            for path, data in {"package.json": b"{}", "AGENTS.md": b"policy", "binary": b"\0\xff",
                               "dev-docs/Obsidian/README.md": b"self"}.items():
                dest = root / path
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
            archive = Path(name) / "source.zip"
            with zipfile.ZipFile(archive, "w") as output:
                for path in root.rglob("*"):
                    if path.is_file():
                        output.write(path, "repo/" + path.relative_to(root).as_posix())
            selected = audit.read_snapshot(root)
            self.assertEqual(selected, audit.read_snapshot(archive))
            self.assertIn("AGENTS.md", selected)
            self.assertNotIn("dev-docs/Obsidian/README.md", selected)

    def test_rootless_zip(self):
        """A rootless repository archive is also supported."""
        with tempfile.TemporaryDirectory() as name:
            archive = Path(name) / "source.zip"
            with zipfile.ZipFile(archive, "w") as output:
                output.writestr("package.json", "{}")
                output.writestr("a.ts", "a")
            self.assertEqual(len(audit.read_snapshot(archive)), 2)

    def test_unsafe_path(self):
        """Archive paths are validated even though the tool never extracts files."""
        for path in ("../outside", "/absolute", "dir\\file"):
            with self.assertRaises(ValueError):
                audit.safe_name(path)

    @unittest.skipUnless(shutil.which("git"), "Git not installed; archive checks still apply")
    def test_git_selection(self):
        """Include tracked ignored files and untracked source, exclude ignored outputs."""
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            for path, data in {"package.json": "{}", ".gitignore": "*.bin\n",
                               "keep.bin": "tracked", "deleted.ts": "old"}.items():
                (root / path).write_text(data)
            subprocess.run(["git", "-C", str(root), "add", "-f", "."], check=True)
            (root / "deleted.ts").unlink()
            (root / "ignored.bin").write_text("build output")
            (root / "new.ts").write_text("new source")
            selected = audit.read_snapshot(root)
            self.assertIn("keep.bin", selected)
            self.assertIn("new.ts", selected)
            self.assertNotIn("ignored.bin", selected)
            self.assertNotIn("deleted.ts", selected)

    @unittest.skipUnless(shutil.which("git"), "Git not installed; archive checks still apply")
    def test_local_git_ref_without_checkout(self):
        """A committed upstream tree can be compared without a second worktree."""
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            (root / "package.json").write_text("{}")
            (root / "a.ts").write_text("upstream")
            subprocess.run(["git", "-C", str(root), "add", "."], check=True)
            subprocess.run(["git", "-C", str(root), "-c", "user.name=Test", "-c",
                            "user.email=test@example.invalid", "commit", "-qm", "baseline"], check=True)
            baseline = audit.read_git_ref(root, "HEAD")
            (root / "a.ts").write_text("fork")
            self.assertEqual(baseline["a.ts"], audit.digest(b"upstream"))
            self.assertEqual(audit.read_snapshot(root)["a.ts"], audit.digest(b"fork"))
            with self.assertRaises(ValueError):
                audit.read_git_ref(root, "--output=/tmp/unwanted")

    def test_duplicate_archive_path(self):
        """Reject duplicate member names instead of approving their last contents."""
        with tempfile.TemporaryDirectory() as name:
            archive = Path(name) / "source.zip"
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                with zipfile.ZipFile(archive, "w") as output:
                    output.writestr("repo/package.json", "{}")
                    output.writestr("repo/a.ts", "one")
                    output.writestr("repo/a.ts", "two")
            with self.assertRaises(ValueError):
                audit.read_snapshot(archive)

    def test_bad_hash_and_status(self):
        """A malformed fingerprint or mismatched presence state is invalid."""
        for field, value in (("fork_sha256", "not-a-hash"), ("status", "upstream-only")):
            invalid = copy.deepcopy(self.manifest)
            row = next(row for row in invalid["files"] if row["status"] == "modified")
            row[field] = value
            with self.assertRaises(ValueError):
                audit.validate_manifest(invalid)

    def test_cli_report_never_overwrites(self):
        """CLI reports drift as exit 1, preserves the manifest, and rejects overwrite."""
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            fork, upstream = root / "fork", root / "upstream"
            for source in (fork, upstream):
                source.mkdir()
                (source / "package.json").write_text("{}")
            (fork / "a.ts").write_text("fork")
            (upstream / "a.ts").write_text("upstream")
            f, u = audit.read_snapshot(fork), audit.read_snapshot(upstream)
            manifest = {"schema_version": 1, "customizations": [{"id": "OBS-001"}],
                        "comparison": {"fork": audit.tree_info(f), "upstream": audit.tree_info(u)},
                        "files": [dict(row, ids=["OBS-001"], note="reviewed", kind="test")
                                  for row in audit.compare(f, u)]}
            manifest_path = root / "inventory.json"
            manifest_path.write_text(json.dumps(manifest))
            before = manifest_path.read_bytes()
            (fork / "unmarked.ts").write_text("new")
            report = root / "report.json"
            command = [sys.executable, str(Path(__file__).with_name("audit.py")),
                       "--fork", str(fork), "--upstream", str(upstream),
                       "--manifest", str(manifest_path), "--report", str(report)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIn("UNREVIEWED", result.stdout)
            self.assertIn("unmarked.ts", report.read_text())
            self.assertEqual(manifest_path.read_bytes(), before)
            saved_report = report.read_bytes()
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(report.read_bytes(), saved_report)
            self.assertEqual(manifest_path.read_bytes(), before)

    def test_render_covers_every_row(self):
        """Human-readable output contains each reviewed path and stable ID link."""
        output = audit.render(self.manifest)
        for row in self.manifest["files"]:
            self.assertIn(f"`{row['path']}`", output)
        self.assertIn("customizations.md#obs-001", output)


if __name__ == "__main__":
    unittest.main()
