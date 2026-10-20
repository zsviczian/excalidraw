# PR #469: cross-document runtime ownership merge review

Review date: 2026-10-20. PR: https://github.com/zsviczian/excalidraw/pull/469.

Fork parent: `b743bd52f4a7c969ad5b8431c5c211b13422b490`.
Incoming upstream: `d3a9c2a195182bf65b526ccb7a19de96f4bdfdb3`.
Merge base: `e1b7aacb356a492aa1e0fc6eb57b8896124027f0`.
Plugin integration source: `60af5d5cb80bc43cdf3773ff5f168bae4b8a0202`
(`2026-10-13-drawing-load-diagnostics`), exact dependency `0.18.143`.
No package/version/dependency publication or update belongs to this checkpoint.

## Resolution and compatibility

Review all 79 incoming paths, including the 23 files Git reported as conflicted.
The final incoming commit includes the frame-label and embed-placeholder SVG
measurement reverts. Keep the final upstream measured paths and its single
`config.environment` contract; do not resurrect the superseded global render
setter or SVG-only `ownerDocument` option. SVG/frame/embed measurement and DOM
creation now use the same explicit environment as raster exports.

- Adopt upstream `AppHost` intact. It owns a stable per-editor environment,
  instance-owned hyperlink identity, asynchronous link-icon repaint, and
  ownership-checked interaction teardown. The plugin still supplies only its
  stable `ownerDocument`, with one shared runtime and a recreated root after
  migration. Storage remains main-window-owned. Neither host protocol changes.
- Retire five complete file deltas: `reactUtils.ts`, `renderer/animation.ts`,
  `ColorPicker/colorTopPicksDnD.ts`, `FontPicker/fontTopPicksDnD.ts`, and
  `TopPicksDnD/topPicksDnD.tsx`. These files now match the pinned incoming bytes.
  Upstream supplies the same owner-window scheduling, cancellation, drag DOM,
  style measurements and release timers; it additionally uses instance symbols
  and pagehide cleanup. Keep trail coordinate offsets and fork-only input paths.
  OBS-020/021 remain active for those other behaviors; their IDs are not retired.
- Adopt current-item-font prewarming rather than the fork's empty-scene-only
  Excalifont preload. Keep Local Font identity, replacement/registration rules,
  unrelated-host-font filtering, public font helpers and document registration.
- Retain document-local generic tooltip timers/observers/warm state. Upstream
  still has one generic timer/observer for all documents, so it is not an
  equivalent replacement. Adopt upstream CSS constants and `hideDocumentTooltip`;
  App's explicit hide is scoped to its document. Hyperlink tooltips use upstream
  ownership/blur/pagehide handling, retaining Markdown previews and the host
  search/suggester UI. The multiwindow test explicitly advances the second
  document's own delay; it does not borrow the first document's warm state.
- Retain image promise cancellation, stable-ID replacement, call-scoped trusted
  SVG normalization, post-decode unmount guard and public `awaitImageFiles`.
  The upstream factory now supplies the retained image. Migration persistence,
  synchronous source unmount and destination drawing-state handoff are unchanged.
- Build the element renderer from upstream's exception-safe `withSavedContext`
  structure. Carry forward custom pen paths/outlines through its `createPath`,
  host canvas limits, iOS/PDF/bitmap/SVG inversion metadata, marker colors/dashes,
  embed magnification and selection outlines. The fork-only highlighter canvas
  explicitly receives both the environment and owning DPI. Do not restore the
  old transform/save/restore blocks over upstream's finally-based cleanup.
- Retain custom grids, transparent link-icon backing, `hasTextLink`, and baked
  link opacity. Opacity participates in the new bounded environment cache key,
  preserving the old compositing order and preventing reuse across host settings.
- Preserve rawText, bound-link semantics, IDs, saved marker/anchoring/embed data,
  awaited paste/drop hooks, tray UI, host APIs, all legacy export entry points and
  the independent `getDimensions` viewport/scale contract. The legacy callback's
  actual scale is passed to both scene rendering and render configuration.
- Restore upstream test hook declarations/initialization/mount only under
  `isTestEnv()`. The fork's prior blanket suppression prevented the incoming
  ownership tests from running. Dev/production must not publish an editor via
  `window.h`. Do not claim this repairs the entire older UI harness.

## Incoming path ledger

Every path below is checked against the merge base, fork parent and incoming
commit. IDs refer to the original behavior ledger and its preserved consumers.
`Upstream exact` means the entire file matches the pinned incoming commit.
`Host delta retained` means the existing customization survives with the
resolution described above; auto-merging alone was not the acceptance evidence.

| Incoming path | Result | Prior behavior IDs |
| --- | --- | --- |
| `packages/common/src/editorInterface.ts` | Host delta retained | OBS-005, OBS-022 |
| `packages/common/src/utils.ts` | Host delta retained | OBS-020, OBS-004 |
| `packages/element/src/__tests__/stickyNote.test.ts` | Upstream exact | Upstream path |
| `packages/element/src/dragElements.ts` | Upstream exact | Upstream path |
| `packages/element/src/embeddable.ts` | Host delta retained | OBS-010, OBS-016, OBS-009 |
| `packages/element/src/image.ts` | Host delta retained | OBS-017 |
| `packages/element/src/index.ts` | Upstream exact | Upstream path |
| `packages/element/src/newElement.ts` | Host delta retained | OBS-009, OBS-012, OBS-015, OBS-016 |
| `packages/element/src/renderElement.ts` | Host delta retained | OBS-014, OBS-015, OBS-016, OBS-018, OBS-027 |
| `packages/element/src/renderEnvironment.ts` | Upstream exact | Upstream path |
| `packages/element/src/resizeElements.ts` | Host delta retained | OBS-037, OBS-029 |
| `packages/element/src/stickyNote.ts` | Upstream exact | Upstream path |
| `packages/element/src/textElement.ts` | Host delta retained | OBS-009 |
| `packages/element/src/textMeasurements.ts` | Upstream exact | Upstream path |
| `packages/element/src/textWrapping.ts` | Upstream exact | Upstream path |
| `packages/element/src/transform.ts` | Host delta retained | OBS-009, OBS-036 |
| `packages/element/tests/linearElementEditor.test.tsx` | Upstream exact | Upstream path |
| `packages/element/tests/renderEnvironmentCaches.test.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/CHANGELOG.md` | Host delta retained | OBS-001, OBS-007, OBS-009, OBS-011 |
| `packages/excalidraw/actions/actionBoundText.tsx` | Host delta retained | OBS-009, OBS-010 |
| `packages/excalidraw/actions/actionClipboard.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/actions/actionFlip.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/actions/actionProperties.tsx` | Host delta retained | OBS-015, OBS-022, OBS-025, OBS-026 |
| `packages/excalidraw/actions/actionStyles.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/animatedTrail.ts` | Host delta retained | OBS-020 |
| `packages/excalidraw/appState.ts` | Host delta retained | OBS-008, OBS-015, OBS-025, OBS-026, OBS-027, OBS-028, OBS-036 |
| `packages/excalidraw/charts/charts.bar.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/charts/charts.helpers.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/charts/charts.line.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/charts/charts.radar.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/charts/index.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/components/App.arrowText.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/components/App.bucketFill.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/components/App.clipboard.ts` | Host delta retained | OBS-009, OBS-011, OBS-026, OBS-030 |
| `packages/excalidraw/components/App.cursor.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/components/App.host.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/components/App.pan.ts` | Host delta retained | OBS-020, OBS-028 |
| `packages/excalidraw/components/App.selectionTool.ts` | Host delta retained | OBS-029 |
| `packages/excalidraw/components/App.text.ts` | Host delta retained | OBS-009, OBS-026 |
| `packages/excalidraw/components/App.tsx` | Host delta retained | OBS-007, OBS-008, OBS-010, OBS-011, OBS-014, OBS-015, OBS-016, OBS-017, OBS-019, OBS-020, OBS-021, OBS-022, OBS-023, OBS-024, OBS-027, OBS-028, OBS-029, OBS-030, OBS-032, OBS-037 |
| `packages/excalidraw/components/App.viewport.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/components/ColorPicker/colorTopPicksDnD.ts` | Upstream exact | OBS-021 |
| `packages/excalidraw/components/ConvertElementTypePopup.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/components/FontPicker/fontTopPicksDnD.ts` | Upstream exact | OBS-021 |
| `packages/excalidraw/components/PasteChartDialog.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/components/PublishLibrary.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/components/SearchMenu.tsx` | Host delta retained | OBS-009 |
| `packages/excalidraw/components/Stats/FontSize.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/components/Stats/MultiDimension.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/components/Stats/MultiFontSize.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/components/TTDDialog/common.ts` | Host delta retained | OBS-030 |
| `packages/excalidraw/components/Tooltip.tsx` | Host delta retained | OBS-021 |
| `packages/excalidraw/components/TopPicksDnD/topPicksDnD.tsx` | Upstream exact | OBS-021 |
| `packages/excalidraw/components/canvases/InteractiveCanvas.tsx` | Host delta retained | OBS-020, OBS-027, OBS-028 |
| `packages/excalidraw/components/hyperlink/Hyperlink.tsx` | Host delta retained | OBS-010, OBS-021 |
| `packages/excalidraw/components/hyperlink/helpers.ts` | Host delta retained | OBS-010 |
| `packages/excalidraw/data/blob.ts` | Host delta retained | OBS-011 |
| `packages/excalidraw/data/index.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/fonts/Fonts.ts` | Host delta retained | OBS-013 |
| `packages/excalidraw/index.tsx` | Host delta retained | OBS-005, OBS-006, OBS-007, OBS-009, OBS-010, OBS-013, OBS-030 |
| `packages/excalidraw/package.json` | Host delta retained | OBS-002, OBS-003, OBS-004 |
| `packages/excalidraw/reactUtils.ts` | Upstream exact | OBS-020 |
| `packages/excalidraw/renderer/animation.ts` | Upstream exact | OBS-020 |
| `packages/excalidraw/renderer/staticScene.ts` | Host delta retained | OBS-014, OBS-018, OBS-027 |
| `packages/excalidraw/renderer/staticSvgScene.ts` | Host delta retained | OBS-014, OBS-015, OBS-016, OBS-018 |
| `packages/excalidraw/scene/Renderer.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/scene/export.ts` | Host delta retained | OBS-007, OBS-009, OBS-015, OBS-018 |
| `packages/excalidraw/scene/types.ts` | Host delta retained | OBS-014, OBS-015 |
| `packages/excalidraw/tests/crossDocument.test.tsx` | Host delta retained | OBS-017, OBS-020, OBS-021, OBS-033 |
| `packages/excalidraw/tests/fitToContent.test.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/tests/hostAbstraction.test.tsx` | Upstream test plus document-local tooltip delay | Upstream path |
| `packages/excalidraw/tests/renderCaches.test.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/tests/renderOverrides.test.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/tests/scene/export.test.ts` | Upstream exact | Upstream path |
| `packages/excalidraw/tests/scrollConstraints.test.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/tests/tooltip.test.tsx` | Upstream exact | Upstream path |
| `packages/excalidraw/types.ts` | Host delta retained | OBS-007, OBS-008, OBS-009, OBS-010, OBS-014, OBS-015, OBS-016, OBS-017, OBS-022, OBS-027, OBS-029, OBS-030 |
| `packages/excalidraw/wysiwyg/textWysiwyg.tsx` | Host delta retained | OBS-009, OBS-010, OBS-021, OBS-024 |
| `packages/utils/src/index.ts` | Host delta retained | OBS-007, OBS-018 |

The two additional test edits outside the incoming list are the legacy export
scale assertion in `tests/obsidianExport.test.ts` and the fork-owned
`tests/obsidianRenderEnvironment.test.ts`. The latter covers scoped custom pen
paths/outlines and opacity variants sharing one environment. No plugin
production source or migration/persistence implementation changes.

## Validation

- Node 22.22.3 / Yarn 1.22.22: Obsidian artifacts and generated declarations pass.
- 14 focused/maintained suites pass, 88 tests: cross-document hosts/fonts,
  tooltips, scoped render caches, image readiness, custom pen paths/outlines,
  baked opacity, legacy exports, animation queues, both host adapters, raw text,
  portal visibility, and Obsidian selection/wrapping.
- Required full `test:update`: 75 suites pass / 80 fail; 1,157 tests pass /
  1,457 fail / 47 skipped / 1 todo. This is not a clean broad test gate.
  The fork's previously disabled hook prevented those older tests from running.
  On an isolated parent checkout with the same test-only hook restoration,
  selection/wrap/export reproduce 84 failures / 30 passes / 1 skip, including
  missing shared UI/canvas handles and a stale SVG snapshot. Do not attribute
  every broad failure to that one cause. The 15 unrelated generated snapshot
  files and one inline snapshot change were restored.
- Full TypeScript has exactly three test diagnostics also reproduced on that
  parent: the existing toHaveBeenCalledOnce matcher type, rawText missing from
  elementFixture, and toolQueries' mermaid key. No changed production/new-test
  diagnostic remains. Focused rendering and test files lint without findings;
  remaining touched-file style/unused warnings are legacy fork debt.
- Plugin production and development builds pass against locally copied four
  artifacts. Production retains 16 circular reports; both parent and candidate
  development builds emit the same five pre-existing TS7006 warnings plus the
  existing Rollup sourcemap-option warning. All four bundle checks pass.
- The installed-package native baseline passes authoring/save/reopen,
  live/disk SVG/PNG export, images and scripts. The merged local build also
  passes native authoring, text Undo and grouped-link interaction scenarios.
- Windows Obsidian 1.14.4 / installer 1.14.0 exact-build probe passes concurrent
  main/popout roots sharing one runtime, loaded image files, matching SVG and
  raster/blob output in both windows, document-local generic and hyperlink
  tooltips, a blank popout's selected-font readiness, popout image insertion,
  dirty migration both ways, durable reopen, and surviving-editor interaction.
  A deliberately delayed normalized SVG decode is cancelled by source teardown;
  its awaitImageFiles settles, a late load event is harmless, and the replacement
  root retains the edit. Closing the popout removes its ExcalidrawLib alias while
  preserving the main alias and pre-existing React globals. No editor test hook
  is exposed. The test vault already changes an unrelated window.h object over
  migration on the parent too; asserting that object's absence/identity was an
  invalid early probe. All owned drawings/assets/controllers clean up, and the
  final JavaScript error buffer is empty.
- Probe setup corrections are not runtime fixes: focus the main test window,
  reacquire a leaf after createAndOpenDrawing's asynchronous open, explicitly
  start/observe scene-file loading without awaiting an optional callback on a
  no-op request, and intercept the normalized SVG URL for the delayed decode.
  Earlier setup/timeouts and their cleanup are preserved in local reports.

### Exact parent comparison and artifacts

The unmodified `b743bd52f` runtime (temporary baseline test-hook edits removed
before its artifact build) and final merged runtime both pass the complete
Windows probe. For the normalized seeded text/rectangle/SVG-image fixture,
all main/popout exports have dimensions **264 ? 155**, PNG blob size **9,788**
bytes, identical raw PNG-pixel SHA-256
`122d1196c0e7f830f929b832ac295836379815a102c35d8ab29e78ce8b6078b1`,
and identical SVG-markup SHA-256 (font inlining disabled for this fixture)
`15fcfff88e7d0801b600bd28efd8ffa5ccc842383dc4cb0b0d04735faaa159af`.
This is fixture parity, not equivalence for every saved scene.

Parent plugin: **4,956,378 bytes**; candidate: **4,960,894 bytes**
(**+4,516**, **281,986 bytes** below 5,242,880). Candidate main.js SHA-256:
`6789b30975f3f1facc1e7e1e65caaeac73d700c4a2d4b17229ac919fab10e739`.
The four installed artifacts match the final fork outputs byte-for-byte.
Final candidate was restored and deployed after the parent comparison.

Local ignored plugin reports: `tmp/pr469-baseline-runtime/report.json`,
`tmp/pr469-candidate-runtime/report.json`,
`tmp/pr469-parent-exact-popout/report.json`, and
`tmp/pr469-candidate-final-popout/report.json`. The last two record exact
plugin hashes, fixture steps/results, source provenance and successful cleanup.
`tmp/pr469-comparison.json` contains the equality check. Source/test/type/lint,
audit and build logs are in the fork's ignored `tmp/pr469-*` files.

The ledger now accounts for **233** differences: **161 modified**, **33
fork-only**, **39 upstream-only**; full tree sizes are **1,312 / 1,318**.
The offline checker and all 15 checker tests pass against the named incoming
snapshot. Inventory validation is independent of the remaining runtime gates.

### Remaining gates

No macOS, Linux, physical mobile, full offline/cold-application-restart,
restored-workspace popout, mixed-monitor DPI, maximized-popout hand/laser
interaction, full portal click-outside/Escape matrix, or forced-GC heap-retention
run is claimed. Hand/laser tool switching and teardown are covered, which is not
physical dragging/painting. The source keeps the macOS-critical synchronous
unmount-before-await boundary unchanged, but Windows evidence cannot certify its
macOS/Electron behavior. Builds, accounting and these fixtures do not establish
zero regressions or published-package release readiness. Before release, repeat
the focused concurrent/image/tooltip/dirty-migration workflows on macOS, then
physical-device font/pen/touch/export smoke and the remaining window/heap gates.
