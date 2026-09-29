#!/usr/bin/env python3
"""Check the reviewed Obsidian fork inventory against local source snapshots.

Purpose: catch unmarked, binary, added, removed, and changed deltas without Git
         ancestry assumptions. This is documentation tooling, not a runtime test.
Author: zsviczian fork-maintenance tooling.
References: README.md, file-inventory.json, customizations.md in this directory.
Notes: stdlib only, Python 3.10+. Directories, ZIPs, and local Git refs are supported.
       No network, installs, extraction, checkout, or source writes.
       The inventory directory excludes itself to avoid recursive fingerprints.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
import zipfile
from typing import Any

SELF_PREFIX = "dev-docs/Obsidian/"
ARCHIVE_DIR_IGNORES = {".git", "node_modules", "__pycache__"}
DEFAULT_MANIFEST = Path(__file__).with_name("file-inventory.json")


def digest(data: bytes) -> str:
    """Return a content fingerprint; never infer semantic equivalence from it."""
    return hashlib.sha256(data).hexdigest()


def safe_name(name: str) -> str:
    """Reject ambiguous or escaping archive/member names without extracting them."""
    path = PurePosixPath(name)
    if not name or "\\" in name or path.is_absolute() or ".." in path.parts:
        raise ValueError(f"Unsafe source path: {name!r}")
    return path.as_posix()


def included(name: str) -> bool:
    """Exclude only this audit's own tree from tracked/source comparisons."""
    return not name.startswith(SELF_PREFIX)


def read_archive(archive: zipfile.ZipFile) -> dict[str, str]:
    """Hash a complete rootless or single-root repository ZIP without extraction."""
    members = [item for item in archive.infolist() if not item.is_dir()]
    names = [safe_name(item.filename) for item in members]
    if not names:
        raise ValueError("Empty source archive")
    first_parts = {PurePosixPath(name).parts[0] for name in names}
    strip_root = len(first_parts) == 1 and all("/" in name for name in names)
    result: dict[str, str] = {}
    seen: set[str] = set()
    for item, name in zip(members, names):
        name = name.split("/", 1)[1] if strip_root else name
        if name in seen:
            raise ValueError(f"Duplicate normalized ZIP path: {name}")
        seen.add(name)
        if included(name):
            result[name] = digest(archive.read(item))
    return result


def read_zip(path: Path) -> dict[str, str]:
    """Read an on-disk source archive."""
    with zipfile.ZipFile(path) as archive:
        return read_archive(archive)


def git_tree_id(root: Path, ref: str) -> str:
    """Resolve a local ref to its immutable tree object ID."""
    if not ref or ref.startswith("-"):
        raise ValueError("Git ref must be a non-option name")
    return subprocess.run(
        ["git", "-C", str(root.resolve()), "rev-parse", "--verify", "--end-of-options", f"{ref}^{{tree}}"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()


def read_git_ref(root: Path, ref: str) -> dict[str, str]:
    """Hash a local Git tree without checkout, network access, or source writes."""
    tree = git_tree_id(root, ref)
    archive = subprocess.run(
        ["git", "-C", str(root.resolve()), "archive", "--format=zip", tree],
        capture_output=True, check=True,
    ).stdout
    with zipfile.ZipFile(io.BytesIO(archive)) as source:
        result = read_archive(source)
    if "package.json" not in result:
        raise ValueError(f"Git ref is not a monorepo root: {ref}")
    return result


def read_directory(root: Path) -> dict[str, str]:
    """Hash Git-selected files, or every file in a clean extracted source tree.

    Git mode includes untracked, nonignored additions. Tracked ignored files are
    retained. Archive-tree mode deliberately does not prune fonts, examples,
    lockfiles, dist, or binary extensions: use clean snapshots, not build trees.
    """
    if (root / ".git").exists():
        proc = subprocess.run(
            ["git", "-C", str(root), "ls-files", "--cached", "--others",
             "--exclude-standard", "-z"],
            capture_output=True, check=True,
        )
        names = sorted(set(proc.stdout.decode("utf-8").rstrip("\0").split("\0")))
    else:
        import os
        names = []
        for base, dirs, files in os.walk(root, followlinks=False):
            # Explicitly reject links instead of silently omitting source content.
            for name in list(dirs):
                child = Path(base) / name
                if child.is_symlink() and name not in ARCHIVE_DIR_IGNORES:
                    raise ValueError(f"Symlink directory unsupported: {child}")
            dirs[:] = sorted(name for name in dirs if name not in ARCHIVE_DIR_IGNORES)
            for name in sorted(files):
                names.append((Path(base) / name).relative_to(root).as_posix())
    result: dict[str, str] = {}
    for raw_name in names:
        if not raw_name:
            continue
        name = safe_name(raw_name)
        if not included(name):
            continue
        path = root / name
        if path.is_symlink():
            raise ValueError(f"Symlink file unsupported: {path}; use a Git archive")
        if path.is_file():
            result[name] = digest(path.read_bytes())
        elif path.exists():
            raise ValueError(f"Unsupported source entry (possibly submodule): {path}")
        # A tracked file deleted in the working tree is intentionally absent.
    return result


def read_snapshot(path: Path) -> dict[str, str]:
    """Read local source only; remote fetching and checkout management stay manual."""
    path = path.resolve()
    if path.is_dir():
        result = read_directory(path)
    elif path.is_file() and zipfile.is_zipfile(path):
        result = read_zip(path)
    else:
        raise ValueError(f"Expected a repository directory or ZIP: {path}")
    if "package.json" not in result:
        raise ValueError(f"Source is not the monorepo root (missing package.json): {path}")
    return result


def tree_info(files: dict[str, str]) -> dict[str, Any]:
    """Fingerprint the complete selected tree, including unchanged source paths."""
    payload = "".join(f"{name}\0{value}\n" for name, value in sorted(files.items()))
    return {"files": len(files), "sha256": digest(payload.encode("utf-8"))}


def compare(fork: dict[str, str], upstream: dict[str, str]) -> list[dict[str, Any]]:
    """Produce a two-snapshot delta, not a list of historically proven patches."""
    rows = []
    for name in sorted(fork.keys() | upstream.keys()):
        fhash, uhash = fork.get(name), upstream.get(name)
        if fhash == uhash:
            continue
        status = "modified" if fhash and uhash else "fork-only" if fhash else "upstream-only"
        rows.append({"path": name, "status": status,
                     "fork_sha256": fhash, "upstream_sha256": uhash})
    return rows


def validate_manifest(manifest: dict[str, Any]) -> None:
    """Require explicit human classifications and reject incomplete inventory rows."""
    if manifest.get("schema_version") != 1:
        raise ValueError("Unsupported or missing inventory schema_version")
    entries = manifest.get("customizations", [])
    ids = {entry["id"] for entry in entries}
    if not ids or len(ids) != len(entries):
        raise ValueError("Missing or duplicate customization IDs")
    paths: set[str] = set()
    for row in manifest.get("files", []):
        path = safe_name(row["path"])
        if path in paths or not included(path):
            raise ValueError(f"Duplicate or self-inventory path: {path}")
        paths.add(path)
        if not row.get("ids") or set(row["ids"]) - ids or not row.get("note") or not row.get("kind"):
            raise ValueError(f"Missing/unknown classification: {path}")
        hashes = [row.get("fork_sha256"), row.get("upstream_sha256")]
        for value in hashes:
            if value is not None and (len(value) != 64 or any(c not in "0123456789abcdef" for c in value)):
                raise ValueError(f"Invalid SHA-256: {path}")
        expected_status = "modified" if all(hashes) else "fork-only" if hashes[0] else "upstream-only"
        if not any(hashes) or hashes[0] == hashes[1] or row.get("status") != expected_status:
            raise ValueError(f"Invalid delta/status: {path}")
    if not paths:
        raise ValueError("Empty file inventory")


def check(manifest: dict[str, Any], fork: dict[str, str], upstream: dict[str, str]) -> list[str]:
    """Report changed classifications/fingerprints; never silently bless a delta."""
    validate_manifest(manifest)
    expected = {row["path"]: row for row in manifest["files"]}
    actual = {row["path"]: row for row in compare(fork, upstream)}
    problems = []
    for path in sorted(expected.keys() | actual.keys()):
        if path not in expected:
            problems.append(f"UNREVIEWED {actual[path]['status']}: {path}")
        elif path not in actual:
            problems.append(f"NO LONGER DIFFERS (review retirement/move): {path}")
        elif any(expected[path].get(key) != actual[path][key]
                 for key in ("status", "fork_sha256", "upstream_sha256")):
            problems.append(f"CONTENT/STATUS DRIFT: {path}")
    for label, files in (("fork", fork), ("upstream", upstream)):
        if manifest["comparison"][label] != tree_info(files):
            problems.append(f"TREE DRIFT: {label} (refresh provenance after review)")
    return problems


def render(manifest: dict[str, Any]) -> str:
    """Render a navigable ledger from reviewed classifications, not inferred intent."""
    validate_manifest(manifest)
    out = ["# File-by-file fork inventory", "",
           "Generated by `python dev-docs/Obsidian/audit.py --render`; edit `file-inventory.json`, not this table.", "",
           "Every path differing between the reviewed snapshots is listed, including unmarked, binary, empty, and upstream-only files. "
           "Upstream-only paths are verified fork absences at the recorded merge base; their maintenance purpose needs separate review. "
           "The inventory's own directory is excluded; root policy files remain included.", "",
           "See [scope and provenance](README.md), [behavior catalog](customizations.md), and [retirement backlog](decustomization.md). "
           "Hashes and full-tree fingerprints are in the JSON ledger. Counts exclude this directory.", ""]
    for status, title in (("modified", "Modified in both snapshots"), ("fork-only", "Present only in fork"),
                          ("upstream-only", "Present only in supplied upstream")):
        rows = [row for row in manifest["files"] if row["status"] == status]
        out += [f"## {title} ({len(rows)})", "", "| Path | Inventory IDs | Classification / observed difference |",
                "| --- | --- | --- |"]
        for row in rows:
            path = row["path"]
            link = f"`{path}`" if status == "upstream-only" else f"[`{path}`](../../{path})"
            ids = ", ".join(f"[{item}](customizations.md#{item.lower()})" for item in row["ids"])
            note = row["note"].replace("|", "\\|").replace("\n", " ")
            out.append(f"| {link} | {ids} | **{row['kind']}** — {note} |")
        out.append("")
    return "\n".join(out)


def main() -> int:
    """Provide check/report and deterministic rendering commands for maintainers."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fork", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--upstream", type=Path, help="clean upstream monorepo directory or ZIP")
    parser.add_argument("--git-repo", type=Path, default=Path(__file__).resolve().parents[2],
                        help="local monorepo containing refs; defaults to this checkout")
    parser.add_argument("--upstream-ref", help="local Git ref, for example upstream/master")
    parser.add_argument("--fork-ref", help="compare a committed fork Git ref instead of the working tree")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--report", type=Path, help="write observed hashes to a NEW JSON report, even on drift")
    parser.add_argument("--render", action="store_true", help="render reviewed manifest as Markdown to stdout")
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        validate_manifest(manifest)
        if args.render:
            if args.report or args.upstream or args.upstream_ref or args.fork_ref:
                parser.error("--render cannot be combined with comparison options")
            print(render(manifest), end="")
            return 0
        if bool(args.upstream) == bool(args.upstream_ref):
            parser.error("specify exactly one of --upstream or --upstream-ref")
        if args.fork_ref and args.fork != Path(__file__).resolve().parents[2]:
            parser.error("--fork and --fork-ref cannot be combined")
        fork = read_git_ref(args.git_repo, args.fork_ref) if args.fork_ref else read_snapshot(args.fork)
        upstream = read_git_ref(args.git_repo, args.upstream_ref) if args.upstream_ref else read_snapshot(args.upstream)
        actual = compare(fork, upstream)
        if args.report:
            # Exclusive creation prevents overwriting the reviewed inventory or source.
            with args.report.open("x", encoding="utf-8") as output:
                json.dump({"notice": "Observed fingerprints only. Human review required before copying into the inventory.",
                           "inputs": {"fork": {"ref": args.fork_ref, "tree": git_tree_id(args.git_repo, args.fork_ref)}
                                      if args.fork_ref else {"path": str(args.fork.resolve())},
                                      "upstream": {"ref": args.upstream_ref, "tree": git_tree_id(args.git_repo, args.upstream_ref)}
                                      if args.upstream_ref else {"path": str(args.upstream.resolve())}},
                           "comparison": {"fork": tree_info(fork), "upstream": tree_info(upstream)},
                           "files": actual}, output, indent=2)
                output.write("\n")
        problems = check(manifest, fork, upstream)
        if problems:
            print("\n".join(problems))
            print(f"FAIL: {len(problems)} drift item(s). Review purpose, consumers, and tests before refreshing hashes.")
            return 1
        print(f"PASS: {len(actual)} reviewed differing paths; complete source fingerprints match. "
              "This does not validate runtime behavior or Git ancestry.")
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print(f"Audit error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
