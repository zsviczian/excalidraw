# Obsidian fork inventory

This directory records **why this fork differs from Excalidraw upstream, who consumes each difference, and the evidence required to remove it**. It is part of the maintained repository, not an instruction to freeze the fork at this snapshot. Prefer upstream behavior, then a plugin-side adapter, then the smallest necessary component change.

## Start here

| Document | Purpose |
| --- | --- |
| [Customization catalog](customizations.md) | 37 stable `OBS-xxx` behavior/maintenance groups, implementation owners, consumers, upstream overlap, and retirement gates. |
| [Integration and compatibility contracts](contracts.md) | Exact host protocols, extra props and APIs, saved data, public scripting, and artifact constraints. |
| [Decustomization backlog](decustomization.md) | Ranked source-proven cleanup, conditional migrations, non-candidates, and correctness debt discovered during review. |
| [File ledger](file-inventory.md) / [JSON](file-inventory.json) | All 237 currently differing source paths, including unmarked differences and observed absences. JSON is the editable ledger; Markdown is generated. |
| [Validation and merge playbook](validation.md) | What was actually verified, existing regression tests, missing runtime evidence, and behavior-specific gates. |
| [Obsidian runtime testing](OBSIDIAN_RUNTIME_TESTING.md) | Guarded CLI test-vault deployment, exact-build desktop smoke, reports, and feature-specific host probes. |
| [Local audit checker](audit.py) / [checker tests](test_audit.py) | Dependency-free, offline source accounting; detects changed, new, or retired differences and stale tree fingerprints. |

Repository policies remain in [AGENTS.md](../../AGENTS.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md). This inventory documents existing deviations even when they do not yet comply with those policies; it does not silently approve them.

## Reviewed merge checkpoints

### PR #475 Mermaid 3/Pele - 2026-10-27

The [PR #475 review](pr-475-merge-review.md) accounts for all 72 incoming paths against
`14bb42edee3d6fee6be264e3ee78670b3b9cee79`, fork parent `404912c08166`,
and merge base `b7de45e88111`. Preserve protocol-2 loaded/api and editable
image source, copying readonly skeletons; adapt the public arrow refresh's
transient options. Converter 3/Pele stays Extras-provided with component 3.0.0
and an exact consumer check. No Obsidian 1.15 engine or new retirement.

Ledger: **161 modified, 37 fork-only, 39 upstream-only paths**
(237); complete trees: **1325 fork / 1327 upstream**. Seventy-three focused
component tests, CPU export, nineteen plugin and four Extras tests pass.
Windows native core/main-popout image checks and forty-one offline real-Extras
Mermaid assertions pass, including errors/cleanup. Full suite/type failures,
missing TestAssets corpus and physical-mobile/other-platform/cold-start gates
remain explicit. Local integration only; release versions/dependency unchanged.

### Plugin #3008 wheel zoom limits — 2026-10-26

Final combined macOS validation passed all feature scenarios, the JavaScript
error gate and cleanup. Earlier intermittent ResizeObserver failures below
remain historical evidence; this change does not fix that separate issue.

Wheel input and constrained viewports now honor the plugin's live minimum and
maximum zoom. The comparison baseline is `b7de45e88111f5680ae4bb3c3f3541c7d3b279fe`,
the upstream parent already merged by inherited master PR #473. Its arrowhead
work is unchanged here; `shape.ts` still differs only by the previously recorded
inert WeakMap cleanup. The ledger adds the constrained-viewport override and
focused wheel tests, and updates the wheel controller. No release/protocol bump.

Seven focused tests, artifacts/declarations and plugin production integration
pass. Main/popout native wheel and image-bound assertions pass with cleanup;
the overall runner retains known ResizeObserver teardown errors. Full typecheck
has the same three baseline test diagnostics. Required `test:update`: 81 suites
and 1,192 tests pass; 79 suites and 1,458 tests fail, with three errors, 47 skipped
and one todo. Its generated snapshots were restored. Physical mobile and other
desktop platforms remain separate gates. Local artifact deployment does not
publish the next component release or change the plugin's 0.18.144 dependency.

The 2026-10-12 [PR #465 review](pr-465-merge-review.md) compares the resolved merge with incoming upstream `541653c7c9d587d463a47daacff9fb30e45a52e7`. The fork parent is `52e99975d798fc7c252f2662ba9ba225d09b9ee2`; their merge base is `2df993fb397dd6d64625908c9c10337727617f6f`. The ledger contains **163 modified, 30 fork-only, and 39 upstream-only paths** (232 total); complete tree counts are 1,306 fork files and 1,315 upstream files.

All 25 incoming paths were reviewed. Adopt upstream W wrapping, frame membership/clipping and cut fixes, retaining marker guards, host props/APIs, Markdown and link semantics. Bound-link overrides move to upstream's extracted helpers; narrow fingerprinted AppWrap additions preserve links when deleting/restoring containers. A shared rule stays in the existing fork-owned obsidianText module, with five independent regression tests. Two complete file differences retire: bounds' inert comment and actionFrame's redundant theme echo/inert ordinary-frame factory argument. Their history remains under OBS-015/032/036; no complete OBS ID retires. Twelve existing ledger rows and two new rows are reviewed; the already committed 0.18.141 version is acknowledged without another bump. Current JSON provenance reflects this checkpoint; original ZIP provenance stays immutable. [PR #463](pr-463-merge-review.md), [PR #462](pr-462-merge-review.md) and [PR #458](pr-458-merge-review.md) preserve earlier reviews. Validation and limits are in the [merge review](pr-465-merge-review.md).

### W layout follow-up

The 2026-10-12 `fix/wrap-tray-mode-12264` checkpoint adds a shared non-mobile W/menu gate, four layout cases and the requested AGENTS reminder. Current ledger is **164 modified, 30 fork-only, 39 upstream-only paths** (233); tree counts remain 1,306/1,315. The already committed 0.18.142 version is acknowledged. Prior merge evidence above remains historical; current follow-up validation and reproduction limits are in [validation.md](validation.md).

### PR #468 export API merge

The 2026-10-18 [PR #468 review](pr-468-merge-review.md) uses incoming upstream `e1b7aacb356a492aa1e0fc6eb57b8896124027f0`. All 31 incoming paths are accounted for. Legacy export adapters preserve the unchanged plugin interface and community scripts while using the new upstream renderer. Marker filtering is consolidated; frame colors/raw text and image/link semantics remain. Ledger: **165 modified, 32 fork-only, 39 upstream-only paths** (236); complete trees: 1,306 fork / 1,313 upstream files. Prior version 0.18.143 and PR #467 restore changes are acknowledged. No version/publication or plugin source/dependency update. See the review for runtime evidence and remaining validation limits.

### PR #469 cross-document runtime merge

The 2026-10-20 [PR #469 review](pr-469-merge-review.md) compares incoming
`d3a9c2a195182bf65b526ccb7a19de96f4bdfdb3` with fork parent `b743bd52f` and
merge base `e1b7aacb3`. All 79 incoming paths and 23 conflicted files are
accounted for. Upstream AppHost, scoped environments, scheduling and drag
ownership replace equivalent local patches; five entire file differences
retire. Generic document-local tooltips, migration cancellation/readiness,
custom pen/highlighter and saved host behavior remain. Ledger: **161 modified,
33 fork-only, 39 upstream-only paths** (233); complete trees: 1,312 fork /
1,318 upstream files. The focused 88-test lane and Windows native integration
pass; the broad older suite, three baseline test-type diagnostics and remaining
platform/heap gates are explicitly documented. No version/publication/dependency
update or plugin production-source change. Use this incoming commit for the
current audit; older checkpoint commands below remain historical examples.

### PR #471 Instagram and worker-font merge

The 2026-10-20 [PR #471 review](pr-471-merge-review.md) compares incoming
`bee01e3a12812c930109aa91242658709480bbf3` with fork parent `22d40c4a8` and
merge base `d3a9c2a19`. All six incoming paths are reviewed; Fonts.ts is the
only conflicted file. Adopt upstream Instagram and worker-font support while
preserving host paste, embed and Local Font contracts, including the existing
public Document loader argument. No retirement or protocol/version change.
Ledger: **161 modified, 34 fork-only, 39 upstream-only paths** (234); complete
trees: **1,313 fork / 1,318 upstream**. Use this incoming commit for the current
audit; previous checkpoints remain historical evidence. Validation and limits
are recorded in the review.

### PR #472 lazy-module merge

The 2026-10-21 [PR #472 review](pr-472-merge-review.md) compares incoming
`1d4dc2c0e6e476911d0760e9c3cf3694f2d43384` with fork parent `dc5c28baa`
and merge base `bee01e3a1`. All 21 incoming paths and three conflicts are
accounted for. Mermaid remains supplied by the plugin/Extras through the
unchanged protocol-2 `{loaded, api}` service. Upstream dialog status/retry is
adapted privately; generated-text validation now uses that same supplied API,
retiring its redundant local host lookup. Web-app PWA precaching/Firebase
changes do not alter Obsidian's vault/scene loader. Ledger: **160 modified,
35 fork-only, 39 upstream-only paths** (234); complete trees: **1,316 fork /
1,320 upstream**. Use this incoming commit for the current audit. Fifteen
focused tests, local-artifact builds and Windows native image/offline Mermaid
main/popout checks pass; broad suite/type failures remain explicit. No version,
publication or plugin dependency change.

**2026-10-23 published-package correction:** The plugin's duplicated ambient
Mermaid types drifted when 0.18.144 was installed; copying only runtime artifacts
into 0.18.143 had not tested that declaration handoff. The consumer now derives
its host/loader declarations from the installed package and checks them before
production builds. Published-package byte verification and Windows real-Extras
main/popout checks pass. The [review correction](pr-472-merge-review.md) records
scope, evidence and remaining gates. The ledger acknowledges the already
committed 0.18.144 version bump; no new fork production change or retirement.

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
python dev-docs/Obsidian/audit.py --upstream-ref 14bb42edee3d6fee6be264e3ee78670b3b9cee79
```

`--upstream` can instead name the supplied upstream ZIP. `--fork` defaults to the repository containing this script and can also name a clean directory or ZIP. Comparing the **original** fork ZIP against the handoff ledger should report the two intentional root-policy edits; use the patched checkout for a clean handoff comparison.

`--upstream-ref` reads a local ref from this repository through `git archive`; it never fetches or checks out code. `--git-repo` can select another local checkout. `--fork-ref HEAD` selects a committed fork tree instead of the dirty working tree when a commit-to-commit comparison is needed. Use the exact incoming commit above for this merge; The merge review records both parents; use `--fork-ref` only when intentionally comparing a committed checkpoint. At the 2026-09-29 review, local `upstream/master` still pointed to September 10. It yielded 304 differing paths and 134 apparent drift findings against the then-maintained fork working tree (137 findings against committed `HEAD`). It was the **wrong baseline**, not evidence of new unreviewed fork changes. A different upstream ref or later fork will require a new review and updated provenance; never accept its hashes automatically.

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
