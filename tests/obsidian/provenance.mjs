// zsviczian -- independent Obsidian validation tooling; never shipped.
/** Source identity for independent fork reports; generated/ignored artifacts are separate hashes. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function sourceIdentity(root) {
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean)
    .sort();
  const fingerprints = untracked.map((path) => {
    const file = resolve(root, path);
    if (
      relative(root, file).startsWith("..") ||
      lstatSync(file).isSymbolicLink()
    ) {
      throw Error("Unsafe source identity path");
    }
    return [path, hash(readFileSync(file))];
  });
  return {
    commit: git(["rev-parse", "HEAD"]).trim(),
    dirty: Boolean(git(["status", "--porcelain=v1", "-z"])),
    diffHash: hash(
      git(["diff", "--binary", "HEAD"]) + JSON.stringify(fingerprints),
    ),
    lockfileHash: hash(readFileSync(join(root, "yarn.lock"))),
  };
}
