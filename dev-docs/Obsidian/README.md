# Obsidian fork inventory

This directory records **why this fork differs from Excalidraw upstream, who consumes each difference, and the evidence required to remove it**. It is part of the maintained repository, not an instruction to freeze the fork at this snapshot. Prefer upstream behavior, then a plugin-side adapter, then the smallest necessary component change.

## Start here

| Document | Purpose |
| --- | --- |
| [Customization catalog](customizations.md) | 37 stable `OBS-xxx` behavior/maintenance groups, implementation owners, consumers, upstream overlap, and retirement gates. |
| [Integration and compatibility contracts](contracts.md) | Exact host protocols, extra props and APIs, saved data, public scripting, and artifact constraints. |
| [Decustomization backlog](decustomization.md) | Ranked source-proven cleanup, conditional migrations, non-candidates, and correctness debt discovered during review. |
| [File ledger](file-inventory.md) / [JSON](file-inventory.json) | All 232 currently differing source paths, including unmarked differences and observed absences. JSON is the editable ledger; Markdown is generated. |
| [Validation and merge playbook](validation.md) | What was actually verified, existing regression tests, missing runtime evidence, and behavior-specific gates. |
| [Obsidian runtime testing](OBSIDIAN_RUNTIME_TESTING.md) | Guarded CLI test-vault deployment, exact-build desktop smoke, reports, and feature-specific host probes. |
| [Local audit checker](audit.py) / [checker tests](test_audit.py) | Dependency-free, offline source accounting; detects changed, new, or retired differences and stale tree fingerprints. |

Repository policies remain in [AGENTS.md](../../AGENTS.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md). This inventory documents existing deviations even when they do not yet comply with those policies; it does not silently approve them.

## Current merge checkpoint

The 2026-10-06 [PR #458 review](pr-458-merge-review.md) compares the resolved working tree with incoming upstream commit `53973c3a423fbd75a4ce68107786b4fcb90e4968`. The fork parent is `3494e26aed12bcd38c8d007925ea95e1ed224389`; their merge base is `ed10ac7dca7e40f3f4a31269b4bfba980d0db41e`. The merge commit has not been created. The current ledger contains **164 modified, 29 fork-only, and 39 upstream-only paths** (232 total); complete tree counts are 1,300 fork files and 1,310 upstream files. The two additional differing paths are the migrated selection override and its regression test. Upstream's unchanged `App.modifiers.ts` is covered by the tree fingerprint, not counted as customization.

The JSON's `sources`, `review`, and `comparison` describe this checkpoint. `original_sources` and `initial_review` preserve the initial archive evidence below. Seven existing ledger rows changed since the initial comparison: upstream text/list-marker changes from the already merged PRs #456/#457, the current App extraction, locale/types, and the test helper. Their remaining fork deltas were reviewed before refreshing hashes; no customization was retired. The exact-build desktop smoke and affected main/popout probes passed; standard test-hook/typecheck and physical-mobile limits are recorded in [validation.md](validation.md).

## Initial scope and baseline

Initial source audit: **2026-09-29**, using the three supplied ZIP snapshots. The archive roots and full SHA-256 checksums are recorded under `original_sources` in [file-inventory.json](file-inventory.json). The ZIP comments were subsequently verified against local Git commit objects; the September 29 fork working tree and the recorded upstream commit reproduced the initial ledger's 230 paths and both complete-tree fingerprints exactly.

| Snapshot | Verified local Git commit matching ZIP comment | Package/dependency evidence |
| --- | --- | --- |
| `excalidraw-obsidian-fork-master.zip` | `c36b852a0acacf556277f71e850f22462a4454a6` | `@zsviczian/excalidraw` `0.18.140` |
| `excalidraw-upstream-master.zip` | `5a406e51875157bece389b9bc92d41ff241d5f3d` | `@excalidraw/excalidraw` `0.18.0` |
| `obsidian-excalidraw-plugin-master.zip` | `bd40308a83c1c278fcdc13afa35ac779c24d90d5` | Plugin `2.2.5`, exact fork dependency `0.18.140` |

The initial fork contains **1,296 files**, upstream **1,307**. The byte comparison finds **163 modified paths, 28 fork-only paths, and 39 upstream-only paths**. The last group consists of two complete example trees and `dev-docs/yarn.lock`. The supplied ZIPs lacked `.git`, but the available checkout now confirms that upstream commit `5a406e51875157bece389b9bc92d41ff241d5f3d` is the merge base and ancestor of fork commit `c36b852a0acacf556277f71e850f22462a4454a6`. Thus the 39 upstream-only paths are verified fork-tree removals relative to that merge base. The example configuration removal is recorded in fork commit `a385293bf` (to fix `yarn.lock`); the docs lockfile was removed in `1d8b33260`. These commits do not prove that every missing example file remains intentionally unsupported. Issue/PR numbers in source comments are historical pointers, not independent evidence that a fix exists in this upstream snapshot. Package version numbers are not ancestry evidence either.

Coverage uses all paths and raw bytes, not just `zsviczian` markers. Binary/non-UTF-8 files, empty files, lockfiles, docs, tests, types, packaging, and upstream-only paths are included. Runtime differences were reviewed by behavior, with consumers traced in the plugin. Unchanged upstream capabilities are discussed only where they constrain a customization or offer a replacement; they are not counted as fork work.

**Initial inventory handoff scope:** new inventory documents/checker and edits to the two root policy files only. That initial handoff changed no production code, dependency, version, generated package, or plugin file. This later runtime-testing checkpoint adds test harness scripts and documentation in the sibling plugin without changing plugin production source. Original ZIP provenance stays immutable. The ledger's current fork hashes reflect the root policy edits; its upstream hashes reflect the pinned upstream snapshot. The inventory's own directory is excluded to avoid recursively hashing the manifest into itself. Root policy files are not excluded. Thus the reviewed source delta remains 230 paths, plus this explicitly self-described documentation/tooling directory.

## How to read evidence

A catalog entry is a behavior group, not one Git commit and not necessarily one file. Large integration points, especially `components/App.tsx`, map to many entries. The file ledger supplies the reverse map so a merge reviewer can start from any changed path.

`P: src/...` in the catalog means a path in the **supplied plugin repository**, not a file in this repository. It is intentionally not a fragile relative link to an assumed sibling checkout. Fork source links are relative to this repository. Source paths plus symbols are the stable references; line numbers would age quickly after upstream extractions.

“Retain” means the supplied sources show a present dependency or compatibility requirement. “Candidate” means a future change is worth evaluating, not that it is safe to delete today. “No current caller found” is a bounded static result over these snapshots, not a claim about community scripts, older vaults, or external consumers. Existing tests are evidence of intended assertions, not of passing execution.

## Maintenance workflow

Read the affected catalog entries before changing source. Maintain the inventory in the same patch as a fork addition, edit, move, retirement, dependency change, or upstream merge. A new feature receives the next unused `OBS-xxx` ID; retain retired IDs permanently. Use the owner role to identify which subsystem and plugin counterpart must review it, not as an assertion that an individual accepted ownership.

For each affected entry, update its rationale, source/symbol ownership, consumer, compatibility class, smallest upstream or plugin alternative, and verification. Update every corresponding file row, including changed tests and styles. A moving behavior keeps its ID and records old/new locations. A removed diff needs an explanation: upstream equivalence, plugin migration, or proved inertness. Keep a retirement note and tests even when the active file row disappears.

### Compare locally

Requires Python 3.10+ only. Run from the fork monorepo root. No dependency installation, network access, source extraction, or production writes occur.

```bash
python dev-docs/Obsidian/test_audit.py
python dev-docs/Obsidian/audit.py --upstream-ref 53973c3a423fbd75a4ce68107786b4fcb90e4968
```

`--upstream` can instead name the supplied upstream ZIP. `--fork` defaults to the repository containing this script and can also name a clean directory or ZIP. Comparing the **original** fork ZIP against the handoff ledger should report the two intentional root-policy edits; use the patched checkout for a clean handoff comparison.

`--upstream-ref` reads a local ref from this repository through `git archive`; it never fetches or checks out code. `--git-repo` can select another local checkout. `--fork-ref HEAD` selects a committed fork tree instead of the dirty working tree when a commit-to-commit comparison is needed. Use the exact incoming commit above for this merge; `HEAD` still identifies its fork parent. At the 2026-09-29 review, local `upstream/master` still pointed to September 10. It yielded 304 differing paths and 134 apparent drift findings against the then-maintained fork working tree (137 findings against committed `HEAD`). It was the **wrong baseline**, not evidence of new unreviewed fork changes. A different upstream ref or later fork will require a new review and updated provenance; never accept its hashes automatically.

For Git checkouts, the checker selects tracked and untracked nonignored files using `git ls-files`; tracked ignored files remain included. For extracted directories, use a **clean source tree**: all regular files are scanned except `.git`, `node_modules`, `__pycache__`, and this directory. It deliberately does not ignore binary assets, fonts, examples, lockfiles, or arbitrary build-output names. A dirty extraction can therefore report build artifacts as unreviewed additions. Directory symlinks/files and submodules need explicit handling; the checker rejects unsupported entries rather than silently treating them as ordinary files. Git archive ZIPs can be used for source snapshots.

Exit codes: `0` matched reviewed file and complete-tree fingerprints; `1` drift requiring review; `2` invalid input/tool error. A pass is **not** a runtime, ancestry, test, or release-readiness claim.

### Refresh after reviewing drift

```bash
python dev-docs/Obsidian/audit.py \
  --upstream /absolute/path/to/upstream-root \
  --report /tmp/obsidian-observed-delta.json
```

The report path must not already exist. A report is written even when comparison exits `1`. It contains input paths or local ref/tree IDs and **observed hashes/status only**, not an automatically approved inventory. Review its new/changed/retired rows, then transfer the reviewed hashes and `comparison` tree information to `file-inventory.json`, preserving/updating each human-authored `ids`, `kind`, and `note`. New rows need a classification and rationale; removed rows need a retirement or move record in the catalog. Update source provenance and the review date when the upstream/plugin baseline changes. Preserve previous provenance in Git history or an explicit review reference. Do not leave old ZIP metadata describing a different newly reviewed snapshot.

```bash
python dev-docs/Obsidian/audit.py --render > dev-docs/Obsidian/file-inventory.md
python dev-docs/Obsidian/audit.py --upstream /absolute/path/to/upstream-root
```

No command silently refreshes the reviewed JSON. Root policy changes count as source drift and must be acknowledged just like other documentation differences. Check the inventory directory itself through ordinary diff review and checker tests because it intentionally excludes itself. The checker detects file accounting drift, **not** an inaccurate narrative or an untested behavioral claim.

For upstream merges, use a real merge base and inspect both parents as required by root policy; the two-snapshot checker is only an additional coverage gate. See the [merge playbook](validation.md#merge-playbook) for sequencing and the [retirement backlog](decustomization.md) for small, separately reviewable checkpoints.
