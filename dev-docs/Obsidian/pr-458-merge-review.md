# PR #458 merge review

Review date: 2026-10-06. [PR #458](https://github.com/zsviczian/excalidraw/pull/458) extracts selection and transform handling from App and introduces Alt-click cycling through overlapping elements.

| Input | Commit |
| --- | --- |
| Fork parent | `3494e26aed12bcd38c8d007925ea95e1ed224389` |
| Incoming upstream | `53973c3a423fbd75a4ce68107786b4fcb90e4968` |
| Merge base | `ed10ac7dca7e40f3f4a31269b4bfba980d0db41e` |
| Plugin used for integration | `f30b4c5d3dcb66ac76ced8f05d9e95409ee94c79` |

The checkout was on `excalidraw-master`, with an in-progress merge and two conflict regions in `App.tsx`. All eleven incoming paths, including clean auto-merges, were reviewed against the base and both parents. The plugin worktree was clean. The resolution adds only the required override to the upstream extraction and a focused regression file; root agent/contributor policies and plugin production source are unchanged. No customization is retired, no version/dependency changes are made, and no merge commit is created by this checkpoint.

## Behavior accounting

| Existing behavior | Purpose and consumer | Resolution and evidence |
| --- | --- | --- |
| Unlocked-hit precedence (OBS-029) | Clicking an unlocked object beneath a locked overlay must select the topmost unlocked hit when no unlocked hit is already selected. This affects ordinary plugin editing and host/script selection. | Move the existing decision from `App.handleSelectionOnPointerDown` to `AppSelectionTool.handleSelectionOnPointerDown`. Keep upstream's selected-hit fallback and link handling in order. Incoming upstream still clears this overlap; two new tests fail against its untouched selection module and pass with the migrated override. |
| `App.setSelection` (OBS-007/029) | Class/context extension retains group IDs, bound-text exclusion, and previous selection. It is not an added method on the returned imperative API; no direct current plugin caller was found. Absence of a caller does not authorize removal. | Retain the method byte-for-byte on App and its type contract. It is the custom portion of the second conflict; the adjacent upstream `clearSelection` follows the extraction. |
| Clear/select/bounding-box helpers | Shared upstream machinery underlies host selection, line editing, frames, and group editing. | Use the new upstream owner once. Token comparison, accounting for `this.app` delegation and formatting, confirms unchanged clearing and bounding-box logic. Do not retain duplicate App methods. |
| Crop/resize dispatch (OBS-037) | The element layer preserves saved anchoring and embed magnification used by EA and plugin asset/view utilities. | Crop is an equivalent extraction. Resize differs only by upstream's new Alt-drag threshold. It still calls the fork's `transformElements`/`resizeElements.ts`. Main/popout probes cover an anchored image, Shift-resized embed, and decoded PNG cropping. |
| Text/link/pointer behavior (OBS-010/028/029) | `ExcalidrawRoot.ts` forwards link callbacks and `onPointerUpdate`; `ExcalidrawView.onPointerDown` defers Ctrl-click navigation until selection settles. Host adapters provide double-click preferences. | Auto-merges preserve the host text-creation guard, raw/text-link hit and hover/open handling, pan startup after pointer bookkeeping, the mobile context-menu pointer-move guard, and owner-window scheduling. No Ctrl/Cmd/Shift cycling is introduced; the upstream cycle explicitly excludes those modifiers. Pan down/up notifications and text-creation suppression were checked live in both documents. |
| New modifier tracking and hover replay | Upstream Alt-click hints retain held modifiers across hover refresh and release them on blur/reset. | Keep `App.modifiers.ts`, `App.cursor.ts`, and `HintViewer.tsx` upstream-identical. The new modifier/selection-tool types are upstream additions; fork props, APIs, and host protocol versions are preserved. |

Incoming crop, duplicate, and selection tests and their helper migration remain upstream-identical apart from the helper's existing raw-text fixture field. The two duplicate test edits reflect upstream's new deliberate-drag threshold. English keeps the fork's existing labels plus upstream's new cycling hint.

## Source and inventory verification

- Node 22.22.2; `yarn --cwd packages/excalidraw build:obsidian` passed, including package declaration generation and all four required runtime artifacts.
- `yarn test:app --run packages/excalidraw/tests/obsidianSelection.test.tsx`: **4 passed**, using the mounted editor's public API without `window.h`. A temporary ignored Vitest transform supplying the unmodified incoming `App.selectionTool.ts` produced **2 failures / 2 passes**: locked-overlay selection and subsequent cycling detect the lost customization. Source files were not changed for that negative control.
- ESLint JSON checks: no errors in App, cursor, modifiers, selection tool, HintViewer, or the new regression file. All except App have zero warnings; App has 116 formatting warnings, compared with 117 in its premerge parent. The installation's default `stylish` formatter fails to load, so JSON output was used.
- `yarn test:typecheck` failed with 217 diagnostics involving existing test/declaration graphs, including duplicate source/generated common-package types. Touched test helpers reference stale generated App types and the disabled `createTestHook`; no diagnostic points to the new selection module, modifier module, or changed App source. This is not a passing repository-wide typecheck. Package-local declarations passed.
- A focused TypeScript project rooted at the new public-API regression file and the source ambient declarations passes. It checks that file's imported editor source graph without including ignored generated `dist`/`types` directories; it does not repair or replace the failing repository-wide gate.
- Standard selection/crop/duplicate suites failed during collection: `createTestHook is not a function`. A temporary test-only hook-restoration diagnostic did not repair the old test lane and is not passing regression evidence. F04 remains open; no production test-hook change is included.
- The ledger/checker passes against the exact incoming commit: **232 differing paths**, 164 modified, 29 fork-only, and 39 upstream-only; 15 checker tests pass. Tree counts are 1,300 fork and 1,310 upstream files. New rows account for the migrated override and regression test.

Updating the baseline also touches seven existing ledger rows. The additional upstream text/list-marker/fixture changes in `App.text.ts`, `textWysiwyg.tsx`, and its tests came from already merged PRs #456/#457. Their remaining fork deltas were inspected: raw Markdown edit/submit helpers, raw-text fixture initialization, inline suggester attachment, caret color, width rounding, and popup reset remain intact. Only their reviewed fingerprints change here; no production text code is edited. Locale/types and App/helper fingerprints incorporate the current upstream extraction. Original September archive evidence is retained under `original_sources` and `initial_review`.

## Native Obsidian verification

The guarded exact-build smoke passed in `/Users/zsviczian/Obsidian/excalidraw-test` on macOS, Obsidian **1.14.4**, installer **1.14.0**, using the local fork artifacts and plugin production build. Built/installed hashes matched. Plugin `dist/main.js` is **4,994,944 bytes**, SHA-256 `d9c1be74382dfcf3310c11dc5b213694758b9583045e5e3d6bae77b574815306`.

The smoke covered plugin reload/load, command registration, drawing readiness, owning document, and captured errors. Separate bounded test-only CLI probes created disposable drawings and dispatched events with each canvas's owning window constructors. Both main and popout editors passed:

1. Select an unlocked overlap beneath a locked overlay; Alt-cycle down and wrap without duplication.
2. Leave an isolated locked element unselected.
3. Select a group through the host API and cycle the group as one unit.
4. Keep a small Alt-drag as a click; duplicate after a deliberate drag.
5. Keep an anchored image's dimensions on resize.
6. Shift-resize an embed from width 200 to 250 with scale `[1.25, 1.25]`.
7. Decode `TestAssets/Monkey.png`, enter crop mode, drag its west handle, and crop width 200 to 150.
8. Observe the live host preference blocking double-click text creation; restore the preference after the probe.
9. Suppress Alt-double-click text creation.
10. Receive pointer-down and pointer-up notifications while panning with the hand tool.

The main editor still selected/edited after popout teardown. Both probe runs and the strict smoke reported **no captured JavaScript errors**. A final cleanup inspection found one drawing recreated by a delayed save after its leaf was detached; it was removed after the save settled. The subsequent live vault check confirms no temporary drawings or controllers remain. Local reports are `/private/tmp/excalidraw-pr458/smoke/report.json`, `scenarios-report.json`, and `scenarios-more-report.json`; these paths are local evidence, not a promise of permanent storage. The first crop probe missed the exact image handle position; using the source-defined position `(100, 150)` exercised the intended crop path successfully in both windows.

## Remaining manual coverage

The most likely untested regression is touch selection near locked overlaps while a context menu or transform handle is active. Check that on physical iOS/Android with finger and pen; desktop event probes do not establish native gesture behavior. Check Ctrl/Cmd link opening/hover, Ctrl+Alt lasso, shift selection, line point editing, selected bound text, group editing, frame selection/undo, mixed/anchored multi-selection, and save/reopen of existing drawings. For Alt-resize, separately exercise a handle click below and above the drag threshold. Include main and popout windows for link/edit/resize interactions, Windows/Linux modifier conventions, and physical mobile for touch/context-menu behavior. Existing source and runtime evidence does not justify an absolute zero-regression claim or close the unavailable standard test/typecheck gates.
