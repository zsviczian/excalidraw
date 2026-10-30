# Validation record and upstream-merge playbook

## PR #477 / plugin #3022 coordinated regression checkpoint - 2026-10-30

Tested fork `053a3b9f9e77917c457fce8ca9453d38b92a303b`, plugin
`fd32ac682e2aadc0f982fa23d36da482011117f9` and Extras
`1cdcb7c425a9b80afdc7b39c88861143b4b85e58` pass two complete matching-build
Windows native runs: **357/357 cases each**, including 258 behavioral obligations,
40 device/layout profiles, cleanup/restoration and both native error/layout
negative controls. Both use the plugin's sole repository-local working vault,
`.test-work/vaults/excalidraw-auto-test/`, with automatic workspace builds,
deployment/configuration, explicit CLI targeting and artifact hash verification.

Final portable validation passes 666 canonical cases. This fork contributes
**127 owned source cases (12 new / 115 reused)** and **18 reused built-browser
cases**, plus declaration, artifact and clean package-consumer gates. No claim is
made that the historical upstream web-app suite or whole-repository typecheck
backlog passed. Upstream-owned tests remain unchanged.

Run `npm.cmd run test:native` twice from the sibling plugin checkout with fixed
revisions and fresh report directories, then `npm.cmd run test:regression:portable`
and `node scripts/testing/review3022ProductionDiff.mjs`. These completion changes
are documentation only; no version, protocol, publishing or runtime change.
[Complete case evidence, exact hashes and repeatable commands](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/2026-10-28-automated-test-coverage/docs/testing-evidence/3022/README.md)
are maintained with the coordinator.

The historical sustained ResizeObserver cause remains unidentified; it did not
recur in the final pair, and the strict storm gate is unchanged. Physical mobile,
real OS drag/clipboard, native macOS/Linux and isolated whole-app cold start
remain separate environments. Earlier checkpoints below retain their original
hosts, failures and limitations.

## PR #475 Mermaid 3/Pele - 2026-10-27

The [PR #475 review](pr-475-merge-review.md) records all 72 incoming paths, three conflicts, readonly-image and transient arrow-option adaptations, the paired Extras/plugin handoff, and explicit baseline failures. Obsidian artifacts/declarations, plugin production/development/library and Extras production/API builds complete. Seventy-three focused fork tests, the CPU canvas test, nineteen plugin tests, four Extras tests and both declaration-contract modes pass. Full fork typecheck retains three baseline errors; required test:update has 81 passing/80 failing suites and three errors. Generated snapshots are restored.

Windows Obsidian 1.14.5 `excalidraw-test` passes guarded core authoring/history/wheel/link/image/export checks, an extended main/popout image matrix and forty-one offline Mermaid assertions using real Extras 3.0.0. JavaScript-error and fixture-cleanup gates pass. Main.js is 5,012,218 bytes. Missing TestAssets prevents the separate SVG corpus scenario; macOS/Linux, physical mobile, cold app restart/restored popouts and the complex historical diagram corpus remain manual gates. No release/publish or absolute zero-regression claim.

This document distinguishes **performed checks** from **required future gates**. It records the initial documentation/checker audit and the subsequent local CLI smoke; it is not a component release sign-off. Gate IDs below are referenced throughout the [catalog](customizations.md) and [retirement backlog](decustomization.md).

## W layout follow-up (#12264, 2026-10-12)

Branch `fix/wrap-tray-mode-12264`, parent `bee1292f3` (already version 0.18.142). The action predicate and W key test share a fingerprinted gate using `isFullPanelMode(app)` plus compact/tablet; mobile is excluded. AGENTS has the requested short layout reminder. Inventory has 233 differing paths against the unchanged PR #465 upstream baseline: one new OBS-022/029 action row, plus reviewed policy/test/version fingerprints. No version/dependency/public API or persisted-field changes.

25 focused tests, touched lint (zero warnings), the isolated selection/wrap source typecheck, Obsidian artifacts/declarations and plugin production/development builds pass. Full typecheck remains at 262 existing diagnostics with none in the changed files. Plugin main.js is 5,060,946 bytes (181,934 under 5 MiB), SHA-256 `79376b4e3899409d3fe327ed7b48c5e4a149e29d66f0df92a1caeb9ae7c24983`. Development retains existing published-package type/source-map warnings; plugin source/dependency is unchanged. No package publication or plugin dependency change.

Baseline mounted tests already pass full/tray/compact; the mobile case fails before the new gate and passes afterward. Thus the original reported tray failure is not reproduced, and this checkpoint must not claim its cause was identified. A supplementary exact-build live probe passed full-mode W wrap/unwrap, link ownership and undo/redo, then stopped because the plugin's host UI did not mount the requested command palette. It restored the original test-vault layout and removed its owned drawing/controller. No full live mode-matrix, popout, physical tablet/mobile or native keyboard pass is claimed. Further live probing was stopped at the maintainer's request to finish. Manual follow-up: try W in the original failing tray drawing and on a tablet keyboard.

The precommit snapshot-update run was stopped at the maintainer's explicit request to skip further testing and commit/merge. Unrelated generated snapshots were restored; no full-suite completion is claimed.

The precommit snapshot-update run was stopped at the maintainer's explicit request to skip further testing and commit/merge. Unrelated generated snapshots were restored; no full-suite completion is claimed.

## PR #465 wrapping and frames (2026-10-12)

The [three-way review](pr-465-merge-review.md) accounts for all 25 incoming paths against `541653c7c9d587d463a47daacff9fb30e45a52e7`. Bound-link behavior moves to extracted helpers; narrow fingerprinted AppWrap transfer points fix the reproduced loss of links when deleting/restoring containers. Marker guards, raw Markdown and host/window contracts remain. Two complete path differences retire with proof: bounds' inert comment and actionFrame's redundant theme/inert factory argument. Ledger remains 232 paths (163 modified, 30 fork-only, 39 upstream-only), with 12 refreshed existing rows and two new classifications.

Artifact/declaration and isolated source typechecks, 21 focused tests, 11 runner tests and 15 checker tests pass. Required snapshot-update lane passes 55 suites/610 tests with 95 existing-hook collection failures; unrelated snapshot output is restored. Full typecheck has 256 baseline diagnostics and six additional incoming test assertions using existing canvas-state/action-harness mismatches; no new production/independent-test error. These lanes remain explicitly limited.

Production/development plugin builds and exact-build Obsidian 1.14.4/macOS main/new-popout W/link/rawText/history, linked shape/arrow restoration, marker resize/name, ordinary dark frames, image-frame SVG clipping, Delete/Cut and grouped Cmd-click probes pass, alongside retained crop/resize/selection/Markdown workflows. Teardown/errors/owned cleanup pass. Main.js is 5,059,509 bytes (183,371 below 5 MiB); exact report/hash and physical-device/native clipboard/other-platform limits are in the review. The plugin source/dependency remain clean; no publication.

## PR #463 crop and text resize (2026-10-11)

The [three-way review](pr-463-merge-review.md) accounts for all ten incoming paths and five customized ledger rows against `2df993fb397dd6d64625908c9c10337727617f6f`. Adopt upstream crop/modifier/uncrop and text corner geometry, retaining host input/mobile controls, anchoring, embed scale, rendering metadata and geometry APIs. The dimension helper's now-upstream export permits retiring its redundant fork comment; no complete OBS ID or host API is retired.

Obsidian artifact/declaration, isolated source typecheck, 16 independent tests, 11 host-runner tests, 15 checker tests and the 232-path complete fingerprint check pass. Production lint warnings and all 256 full typecheck diagnostics are unchanged under the same source/type environment. Required snapshot-update testing passes 54 suites/605 tests with 94 existing collection failures; unrelated snapshot output is restored. Ordinary crop/resize suites remain unavailable because of disabled App hooks, with changed behavior tested through the real mounted editor instead.

Plugin production/development builds and exact-build Obsidian 1.14.4/macOS main/new-popout crop modifiers, dynamic recomputation, handle retention, uncropping/undo/redo, rotated/flipped crop metadata and horizontal text corner resize pass. Existing selection, anchored resize, embed magnification, rotated container sizing and 16 Markdown-history variants across both windows pass; grouped Cmd-click adds 12 assertions per window. Teardown, captured errors and owned cleanup pass. Main.js is 5,057,545 bytes (185,335 bytes under the 5 MiB target). These are synthetic owner-window desktop probes; physical input/mobile, other desktop systems, cold restart/restored popouts and broad PDF/export/signed/multi-resize coverage remain separate. Reports and exact hashes are in the review. The plugin source/dependency remains clean, with no publication.

## PR #462 selection extraction (2026-10-11)

The [three-way review](pr-462-merge-review.md) accounts for all 22 incoming paths and the nine reviewed ledger updates against upstream `e65eca999e071503efb893d3379a29fb96ff37c4`. Host selection/highlight/z-order signatures, locked-hit precedence, owning-window RAF, rotated container APIs and Markdown callbacks remain; the new upstream selection implementation is unchanged. No customization is retired and no protocol, dependency, version or saved-field changes are made.

The Obsidian artifact/declaration build, isolated mounted-API source typecheck, 16 focused selection/Markdown tests, 11 offline host-runner tests, 15 inventory-checker tests and the complete 232-path source comparison pass. Touched lint introduces no findings. The full typecheck has 217 existing diagnostics plus 39 incoming assertions against the stale `window.h.app` App type; the ordinary hooked suite is not a passing lane. See the review for the temporary diagnostic-hook restoration, formatting/tooling details and exact limits.

Both plugin production and development builds pass against the four local artifacts; the final production build reproduces the tested SHA-256. Main.js is 4,995,829 bytes (247,051 bytes below the repository's 5 MB target of 5 × 1024 × 1024 = 5,242,880 bytes), 444 bytes above the previous recorded checkpoint. No plugin production source or dependency/lockfile change is part of this merge.

On Obsidian 1.14.4/macOS, exact-build load/reload, main/new-popout selection, drag, duplication, box selection, locked search/highlight, z-order, anchored resize, decoded PNG crop movement, embed scale and rotated-container probes pass. Sixteen raw/parsed text cases across the two windows preserve source, undo and redo after unchanged submission through the new API. Popout teardown leaves the main editor usable; error and disposable-fixture/controller cleanup checks pass. These use bounded synthetic owning-window events and public APIs. Native CDP input stalled and is explicitly not passed; physical mobile, other desktop systems, cold app restart/restored popouts and broad legacy/export/signed/multi-resize coverage remain separate gates. The exact-build report is local at `/tmp/pr462-feature-smoke/report.json`; source and artifact identity are recorded in the review.

## Issue #2976: text-edit history

The paired `fix-2976-text-undo` branches preserve restored scene source when
reopening text and preserve redo after an unchanged raw/parsed Markdown round
trip. The component adds only an internal helper and two call-site lines; no
public API, protocol, dependency, version or persisted-data changes.

The maintainer approved merging these paired source checkpoints before package
publication. The component package and plugin's exact dependency remain at
`0.18.140`; the complete fix requires the unpublished component changes. Publish
the component later with the next batch, update the plugin's dependency/lockfile,
and verify the published pair before plugin 2.29.0, planned for the end of October
2026. The maintainer also confirmed that the local solution works.

- Component Obsidian artifact/declaration build passed; all six focused
  `obsidianText.test.ts` tests and ESLint for the three changed source/test files
  passed. A focused TypeScript source graph rooted at that test passed. The
  repository-wide typecheck still fails in the existing `window.h` and test graph.
- Local component artifacts were copied into the plugin's ignored installed
  package, then its production build and 11 host-runner tests passed. Windows
  Obsidian 1.14.0 passed all 16 combinations of raw/parsed mode, keyboard/toolbar
  history and plain, wikilink, extra-bracket (`[[link]]]`) and aliased source.
  Reopening after undo/redo, unchanged submission, editing after undo and
  legacy/empty source checks passed. JavaScript errors and fixture cleanup passed.
  Cleanup awaits the drawing's empty-view transition before deleting it; a final
  disk check confirms that close/save did not recreate the fixture.
  Plugin `main.js`: 4,995,385 bytes. This is an unpublished integration checkpoint.
- Inventory comparison used upstream
  `53973c3a423fbd75a4ce68107786b4fcb90e4968`. The three changed file rows were
  reviewed and refreshed. The same comparison of the starting fork HEAD
  `b7f9961e184d2bc946340594c3b17beae8b59d4b` already fails for `App.tsx`,
  `wysiwyg/textWysiwyg.tsx`, `wysiwyg/textWysiwyg.test.tsx`, the unlisted
  `tests/embeddable.test.tsx` and the full fork-tree fingerprint. Those unrelated
  merge-checkpoint differences remain unapproved by this patch; the checker
  retains those five baseline findings.

The highest-risk remaining workflow is parsed text inside a bound container,
where editing can also resize the container. Check unchanged reopen and real
edits there, including undo/redo. Repeat on macOS (Command+Z/Shift+Command+Z),
main window and popout, and a physical phone/tablet using toolbar history.
Mobile touch and popout behavior were not established by the Windows CDP run.

## Initial review: what was checked

Review date: 2026-09-29. Inputs and exact archive hashes are in [file-inventory.json](file-inventory.json). The audit read `AGENTS.md` and `CONTRIBUTING.md` in all three supplied repositories, with the fork/plugin policies governing integration and compatibility. Source/consumer review included the fork's `CLAUDE.md`, package/build configuration, plugin runtime/adapters, mount/migration and scripting consumers, and the full path-level upstream-to-fork delta.

The source inventory accounts for **all 230 differing paths**, including 163 modified, 28 fork-only, and 39 upstream-only paths, in 37 stable groups. It includes tests, styles, declarations, lockfiles, empty and non-UTF-8 files; fingerprint searching was supplementary rather than the selection method. The audit records snapshot absences without assigning deletion intent. Git history was unavailable in the original ZIP review. The local checkout now verifies both recorded commit IDs and confirms that the upstream snapshot commit is the fork's merge base; the checker passes against that commit and the maintained fork working tree with both complete-tree fingerprints matching.

The handoff validation uses the commands below to check the inventory against both the extracted upstream directory and original upstream ZIP, run the dependency-free checker tests, regenerate the Markdown ledger deterministically, resolve repository-relative documentation links/explicit inventory anchors, verify the original ZIP checksums, and compare returned files against the original fork. The patch contains only the two root policy edits and the new inventory directory; runtime, dependencies, versions, and plugin sources remain byte-for-byte unchanged. The exact result/count of checker tests is recorded in the handoff summary below.

A small Node probe also confirmed that the added `Object.values(WeakMap)` cleanup pattern does not enumerate/delete weak entries (D02). That is a JavaScript behavior check, not execution of Excalidraw's lifecycle suite.

### Not executed

The extracted repositories have no installed `node_modules`, and a usable Yarn command was not available in the audit environment. No dependencies were installed. The audit **did not execute** the component typecheck, lint/format command, Vitest suites, ESM/type/IIFE builds, tarball consumer tests, plugin build/dev commands, browser rendering, Obsidian main-window/popout workflows, offline checks, physical mobile tests, or performance measurements. It did not measure a new plugin `dist/main.js` size or inspect generated/published package output.

Existing tests were read as assertions of intended behavior, not presented as passing results. In particular, F04 must be resolved/characterized before trusting the component test lane, and F02 requires clean package output before release. These limitations do not obscure the scope of this patch: no production behavior is being changed or claimed regression-free.

### Subsequent local checkout and CLI verification

The available Git checkout verifies that the ZIP comments identify real fork, upstream, and plugin commits. Upstream commit `5a406e51875157bece389b9bc92d41ff241d5f3d` is the merge base of fork commit `c36b852a0acacf556277f71e850f22462a4454a6`. Comparing the maintained fork working tree with that **pinned** upstream commit passes: 230 differing paths and both full-tree fingerprints match `file-inventory.json`. At this review, the local `upstream/master` ref pointed to September 10; using it yielded 304 differing paths and 134 apparent drift findings against the working tree, or 137 findings against committed `HEAD`. Those findings describe a different comparison, so none was copied into the ledger. Git history identifies the examples and documentation-lockfile removals described in OBS-035 and D17.

The dependency-free checker suite now passes 15 tests, including the local Git-ref reader. The plugin's four offline host-runner tests pass. The exact local fork artifact was built and handed to the plugin build, then deployed to the dedicated `excalidraw-test` vault. With Obsidian 1.14.2 (installer 1.14.0), the native smoke passed plugin load, command registration, main-window drawing/API/owner-document assertions, and captured-error checks. It removed its unique drawing and test controller successfully. The built and installed plugin artifact hashes matched; `dist/main.js` was 4,989,625 bytes, SHA-256 `c0010dcadab913fce7b7e288392250408f18db7df0b4101599607d100a0463ee`. The first host run exposed an early command-registration check in the harness; polling that asynchronous registration fixed the false failure. This smoke does not close the feature-specific V03–V11 or physical-device gates.

## Reproduce the inventory checks

### PR #458 checkpoint (2026-10-06)

The [merge review](pr-458-merge-review.md) records the exact parents, migrated unlocked-hit customization, retained `setSelection`, equivalent crop/resize extraction, auto-merge review, and remaining gates. The current comparison uses incoming upstream `53973c3a423fbd75a4ce68107786b4fcb90e4968`: **232 differing paths** and both complete-tree fingerprints match; 15 checker tests pass. Original September counts and archive evidence above remain historical.

The Obsidian artifact/declaration and plugin production builds passed. Four new mounted-editor public-API selection regressions pass in ordinary Vitest; two fail when the incoming selection module is used without the fork override. Exact-build Obsidian 1.14.4 smoke and affected main/popout input, crop, anchoring, embed-magnification, and teardown probes passed with clean error buffers and verified final cleanup. Plugin `main.js` is 4,994,944 bytes. Standard `window.h`-dependent selection/crop/duplicate suites fail at collection, and the repo-wide typecheck fails in the existing generated/test graph; package declarations and a focused source-graph typecheck rooted at the new regression file pass. Physical mobile and the manual cases in the review remain open.

From the fork monorepo root, with Python 3.10+:

```bash
python dev-docs/Obsidian/test_audit.py
python dev-docs/Obsidian/audit.py --upstream-ref 53973c3a423fbd75a4ce68107786b4fcb90e4968
python dev-docs/Obsidian/audit.py --upstream /absolute/path/to/upstream-root
python dev-docs/Obsidian/audit.py --upstream /absolute/path/to/excalidraw-upstream-master.zip
python dev-docs/Obsidian/audit.py --render > /tmp/obsidian-file-inventory.md
cmp dev-docs/Obsidian/file-inventory.md /tmp/obsidian-file-inventory.md
```

Use the **patched** fork tree: comparing the original fork ZIP to this handoff's ledger intentionally detects changes to `AGENTS.md` and `CONTRIBUTING.md`. The inventory self-exclusion and Git-versus-extraction file selection are documented in [README.md](README.md). Binary/raw-byte comparison is intentional. A pass means every observed differing path and complete selected source-tree fingerprint matches a human-reviewed record; it does not establish correctness of the prose, API equivalence, or runtime behavior.

Refresh hashes only after reviewing new/changed/retired behavior. `--report` writes a new observed-only report, never overwrites the ledger, and does not manufacture ownership or retirement decisions. A checksum update alone cannot close a decustomization item.

## Existing regression evidence to preserve

The following tests exist in the supplied fork. Each needs actual execution when its behavior is changed; some exercise unchanged upstream infrastructure as well as the added assertions.

| Test source | Relevant assertions/coverage intent |
| --- | --- |
| [commonObsidianHost.test.ts](../../packages/common/src/commonObsidianHost.test.ts) | Standalone/default behavior, capability forwarding, live settings, protocol mismatch, disposal and stale registration protection. |
| [obsidianExcalidrawHost.test.ts](../../packages/excalidraw/obsidianExcalidrawHost.test.ts) | Structural fake host, service forwarding/errors, settings, pen/touch policy and registration lifecycle. |
| [obsidianText.test.ts](../../packages/excalidraw/obsidianText.test.ts) and [textWysiwyg.test.tsx](../../packages/excalidraw/wysiwyg/textWysiwyg.test.tsx) | Raw-before-edit and independently parsed display/link on submit, including integration with text editing. |
| [clipboard.test.tsx](../../packages/excalidraw/tests/clipboard.test.tsx) | File-aware paste interception and raw text on pasted lines. |
| [actionToggleFrameRole.test.ts](../../packages/excalidraw/actions/actionToggleFrameRole.test.ts) | Marker conversion releases members; undo restores prior membership. |
| [ObsidianRadixPortal.test.tsx](../../packages/excalidraw/components/ObsidianRadixPortal.test.tsx) | Owner-document portal location, host theme resynchronization and mounted-hidden behavior. |
| [crossDocument.test.tsx](../../packages/excalidraw/tests/crossDocument.test.tsx) | Owning-document integration, added top-pick drag/tooltip coverage and currently pending image readiness. |
| [common/utils.test.ts](../../packages/common/src/utils.test.ts), [animation.test.ts](../../packages/excalidraw/tests/animation.test.ts), [renderer/helpers.test.ts](../../packages/excalidraw/renderer/helpers.test.ts) | Supplied-window RAF/cancellation, independent-window animation/timer work, and container-owning-window selection-style lookup/fallback. |
| [colorTargets.test.ts](../../packages/excalidraw/tests/colorTargets.test.ts) | Host regular palettes versus upstream sticky-specific color choices and mixed selection. |
| [FontPicker.test.tsx](../../packages/excalidraw/components/FontPicker/FontPicker.test.tsx) and [fontTopPicks.test.ts](../../packages/excalidraw/tests/fontTopPicks.test.ts) | Fourth top pick and custom/local font selection expectations. |
| [DropdownMenu.test.tsx](../../packages/excalidraw/components/dropdownMenu/DropdownMenu.test.tsx) | Updated accessible-selector expectations accompanying title/label changes. |

These are not comprehensive coverage of the 37 groups. Important missing/insufficiently established gates include SVG frame-width validity, custom stroke canvas/SVG parity, old vault round trips, actual package declaration resolution, platform-specific library saving, complete document isolation, real migration/teardown under pending work, and accessibility after host style changes.

## Required gates for future behavior changes

| Gate | Scope | Minimum evidence before retirement/merge sign-off |
| --- | --- | --- |
| **V01** | Packaging and delivery | Build normal ESM and types plus both Obsidian environments. Inspect the four required runtime artifacts, lexical React/ReactDOM/JSX boundaries, absence of runtime chunks/eager Mermaid/remote required fonts, required font payloads and deliberate CJK path. Validate every manifest type/export target in a clean packed consumer outside workspace hoisting. Verify offline cold load; record plugin production size and compare with an explicit baseline. |
| **V02** | Host/API/type/unit | Run source typecheck and affected test/lint lanes. Structural fake hosts only in boundary tests: defaults, required errors, forwarding, live setting changes, version mismatch, repeated/stale disposal. Compile plugin API/pen-type consumers. Snapshot public additions and test wrappers rather than deleting from no-call searches. Characterize F04. |
| **V03** | Main window, popout, migration | Mount simultaneous editors in distinct documents; move/recreate with a stable owner document; use differing DPI/theme/window state. Preserve scene, selection, viewport, files and host state, with synchronous old-root unmount before asynchronous work. Close either editor without breaking the other. Assert owner-realm DOM/constructors/RAF/timers and main-window storage ownership. |
| **V04** | Text, links, clipboard/drop | Edit raw Markdown, displayed/wrapped text, deleted/empty labels, bound text and legacy wrapping. Test link parsing/hover/open/mobile search, suggester attach/close and key blocking. Await drop handlers and cancellation; paste vault files, external images, text, multi-item data and nullable events without duplicate native insertion. |
| **V05** | Pens, colors and numeric widths | Exercise each custom pen, pressure/no-pressure input, caps/tapers/easing, outline/highlighter layering, preset reset, arbitrary script width, host palettes, sticky/mixed selections and independent bound-text ink. Preserve old serialized stroke settings. |
| **V06** | Fonts, embeds, files, Mermaid | Local Font ID 4 register/replace/load/measure/export, empty-scene font load, Assistant and CJK behavior, lazy host converter with errors/retry, diagram source metadata, vault/media/PDF embeds and desktop/mobile fallbacks. For SVG bypass, compare certified input with ordinary/untrusted input; normal normalization must remain the default. |
| **V07** | UI, accessibility, theme | Main/popout desktop, phone/tablet and physical mobile, tray/full/mobile modes, zero-width startup, settings changes, welcome/help, library save/cancel, keyboard/focus and screen-reader labels. Check both themes, RTL, host CSS isolation, popover/tooltip ownership and duplicate editor roots. |
| **V08** | Saved scenes, frames and geometry | Restore/edit/duplicate/save/reopen legacy and current drawings, short IDs/links, raw text, deleted/group members and orphan repair. Test marker/ordinary/magic frame creation, naming, membership, role change and undo. Check anchoring, embed magnification, scripted selection/z-order, line editing, bound text and arrow refresh. |
| **V09** | Input and interactive canvas | Grid size/direction/colors, selection/link contrast, search highlighting, transient overlays, touch/pen crosshair and double tap, right-button/single-finger pan, `M` path, zoom bounds/step/fit and pointer notification ordering. Do not infer real-device gestures from desktop emulation alone. |
| **V10** | Export fidelity | Compare PNG/canvas/SVG output for highlighters, custom stroke outlines, fonts, links, frames/colors/names, anchored/scaled embeds, bitmap/SVG dark-mode inversion and shared-file inversion variants. Assert marker exclusion from exported content and embedded scene data. Validate numeric SVG attributes and host canvas limits on large images. |
| **V11** | Async teardown and shared caches | Repeated mount/unmount and main/popout migration while images, fonts, Mermaid, animation, tooltips and drags are pending. Verify cancellation/stale callback guards, idempotent disposal, absence of cross-editor cache/timer interference, pending-image all-settled semantics and no hidden paint guarantee. |

## Commands for component/plugin checkpoints

These commands are **instructions for the normal development environment, not a record of execution here**. Use Node 22+ and Yarn in this fork; use npm in the plugin. Verify the toolchain before diagnosing source failures. `build:obsidian` is a **package-local** script, so the root invocation needs `--cwd`.

```bash
# Fork monorepo root; dependencies already provisioned with its Yarn lockfile.
node --version
yarn --version
yarn --cwd packages/excalidraw build:obsidian
yarn test:typecheck
yarn test:app --run packages/common/src/commonObsidianHost.test.ts \
  packages/excalidraw/obsidianExcalidrawHost.test.ts \
  packages/excalidraw/obsidianText.test.ts

# Add each touched subsystem's tests from the table, then ordinary repo checks.
yarn test:code
yarn test:other
yarn test:app --run

# Required when verifying packaging, including the normal ESM/declaration lane.
yarn --cwd packages/excalidraw prepack
# Inspect pack contents without re-running lifecycle scripts or publishing.
(cd packages/excalidraw && npm pack --ignore-scripts --dry-run)
```

The pack listing is not enough: test an actual locally packed tarball in an isolated ESM/TypeScript consumer and inspect runtime/type resolution. Never publish, bump a version, run auth hooks, or update the plugin dependency merely to finish an inventory review. If a baseline command fails, preserve its diagnostics, distinguish touched-file failures from unrelated baseline failures, and report the narrow checks that did run.

For an unpublished integration checkpoint, copy only the four locally built runtime artifacts into the plugin's ignored `node_modules/@zsviczian/excalidraw/dist/obsidian/` directory without changing its dependency declaration, then run `npm run build` in the plugin and `npm run dev` when development payload/CSS changed. Record the production bundle byte size. Exercise applicable V03–V11 workflows in Obsidian; a plugin build alone is not runtime sign-off. A durable plugin release that consumes new APIs separately needs the matching published package and exact dependency/lockfile update under maintainer control.

<a id="merge-playbook"></a>
## Merge playbook

1. **Establish real inputs.** In both repositories record branch, clean/dirty status, source commits and the actual upstream merge base. Preserve local work. Use complete source checkouts/archives, not the text-focused repository exporter. Read root policies, relevant catalog entries and plugin contracts before resolving conflicts.
2. **Review both clean and conflicted deltas.** Use the ledger as a checklist, not only Git conflict markers or `zsviczian` matches. For each behavior record old owner, upstream replacement/extraction, active plugin consumer and saved/public compatibility. Inspect moved/deleted files and dependencies. Keep unresolved absence/ancestry claims explicit.
3. **Follow upstream ownership.** Start from upstream's new file/component organization, migrate only necessary hooks and isolated helpers, and leave unrelated code verbatim. Avoid resurrecting an old component wholesale. Keep call order, async cancellation, selection/undo and ownership semantics. Put independent cleanup in its own checkpoint.
4. **Retire with evidence.** Cite equivalent upstream code, completed plugin migration or source-proven inertness. Preserve public aliases/saved readers where necessary. Keep the stable ID with retirement reference and gate results; remove only obsolete active file rows. A matching name, passing merge, or newly absent caller is insufficient.
5. **Validate the combined result.** Compare against both merge parents, including auto-merged customized paths. Run the immediate Obsidian build, relevant tests/typecheck and plugin checkpoint; then applicable real runtime gates. Record skipped/failed checks precisely. Update catalog, contracts, backlog, file mappings/hashes and baseline provenance in the same PR; regenerate and check the ledger.
6. **Handoff without overstating readiness.** Report changed IDs and consumers, retirements with evidence, artifact/package checks, plugin size, runtime platforms exercised and remaining risks. New plugin APIs must follow the published-package handoff policy. Unverified essential gates remain open.

## Risk-based manual handoff

For this documentation-only patch the immediate risk is an inaccurate inventory statement or a coverage checker being mistaken for runtime approval. Review the source links and a representative file in each group, then reproduce the checker tests and source comparison.

For follow-on cleanups, the most likely regressions are hidden public/script dependencies, changed raw-text/legacy scene interpretation, early-state/UI timing, and cross-document async ownership. Main-window, popout, physical iOS/Android, offline assets, old-file round trips and SVG/canvas export require separate evidence; none is waived by this audit.

## Handoff checker result

**Original ZIP handoff recorded:** 14 dependency-free checker tests, including Git file selection, binary/empty/unmarked differences, new/retired/content drift, archive handling, classification validation, and exclusive report creation without manifest mutation. Both upstream-directory and upstream-ZIP comparisons passed with 230 reviewed differences and matching complete-tree fingerprints. The Markdown ledger reproduced byte-for-byte; all 759 repository-relative documentation links/anchors and explicit plugin source paths resolved. All three original ZIP checksums/comments matched the recorded provenance. The handoff archive contained exactly 11 added/modified files, with no deletions or other source changes; its member paths, content bytes and ZIP integrity were checked. The subsequent local Git and native smoke results are recorded above; neither the original audit nor the basic smoke closes feature-specific runtime gates.


## PR #468 export API checkpoint (2026-10-18)

See [three-way review, export compatibility and validation limits](pr-468-merge-review.md). Public export adapters preserve plugin/script calls. Exact linked/image SVG markup and seeded PNG pixels match before/after fixtures; native plugin link filtering, conversion and export hook pass. Artifact/declaration, plugin production/development and bundle checks pass. Existing full-suite/typecheck failures remain explicit; this is an unpublished local handoff, without plugin source/dependency changes.


## PR #469 validation checkpoint ? 2026-10-20

[The merge review](pr-469-merge-review.md) records all incoming paths, the
parent/candidate distinction, native artifact hashes, partial decustomization
and complete limits. Fourteen focused/maintained suites pass all 88 tests.
Source/declaration and plugin production/development builds pass; broad tests
and TypeScript are not reported as clean. Parent reproduction establishes the
three untouched type errors and representative older UI-harness failures.
Windows native scenarios cover two concurrent roots, fonts/images/tooltips,
exports, dirty bidirectional migration, a deliberately pending image decode,
late callbacks, durable reopen and alias teardown. Do not substitute this for
macOS, restored/cold/offline/physical-mobile, mixed-DPI/maximized pointer/laser
or forced-GC checks. The source migration persistence/unmount boundary is
unchanged. See the review for exact-build comparison and remaining gates.


## PR #472 validation checkpoint (2026-10-21)

[The merge review](pr-472-merge-review.md) accounts for all 21 incoming paths,
three conflicts and the redundant generated-text host-lookup retirement.
Fifteen focused tests, touched-source lint, Obsidian artifacts/declarations,
plugin production/development builds and bundle checks pass. Full typecheck
retains the three documented baseline test diagnostics. Required `test:update`
is **not green**: 79 passed/79 failed suites; 1174 passed/1458 failed tests,
47 skipped/one todo, three errors. Its unrelated snapshot writes are restored.
Windows Obsidian 1.14.4 native CLI image/export/save-reopen and genuine offline
Extras Mermaid main/popout selected-source previews and durable reopen pass,
with no captured errors. The prior sequence/vector and SVG-selector probe
assumptions were corrected; no production fix was made for them. Source and
package versions remain unchanged; no publication/dependency handoff. Physical
mobile, macOS/Linux and web-app Firebase/PWA deployment are not claimed tested.
