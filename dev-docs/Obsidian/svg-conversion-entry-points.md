# SVG insertion and conversion entry points — plugin #3027

Base: `745d62f7071be4da192f595bb75e140a7b741fc0`; comparison upstream:
`a758e93d6a03e9f995973703cb886850a398a6d3`. OBS-039 adds four narrowly scoped
production changes: shared ImageMenu entry, typed host contract, fork-owned
host dispatch helper and a fingerprinted TTD pre-insertion block. All parsing,
choice UI, target validation, replacement, layering, saving and asset handling
remain in the plugin. Existing host/runtime and Mermaid preview/close behavior
are retained. No upstream feature or customization was retired.

The host protocol advances to 4 because the paired runtime now requires
`prepareMermaidSVGInsert`. There is no Extras API, package version or plugin
dependency change. A locally matched artifact/declaration handoff is an
integration checkpoint; publish/install matching package bytes before release.

Source coverage exercises native synchronous passthrough, standalone SVG
insertion, editor-ID forwarding, conversion, keep-image, cancellation, retained
errors and editor teardown. Existing close/wheel/compatibility/packed-consumer
fixtures are coordinated with protocol 4. Runtime cases use the plugin's owned
vault, shared session lock and existing trusted-input/diagnostic environment.

Validation passes: 146 owned regression cases (seven new insertion cases),
20 existing production/development browser cases, full type checking, ESM and
Obsidian artifact/declaration builds, clean packed consumer, 268 reviewed
paths and all 15 audit-checker tests. The package-consumer tooling now selects
the actual npm CLI when launched through Yarn; no packaging/runtime fallback
was added. Upstream tests remain unchanged.

The final plugin-owned native sequence passes 20 cases: ten new UI cases across
main/popout plus ten reused converter cases. Trusted pointer/keyboard actions
exercise the SVG picker including cancellation, real Extras Mermaid conversion,
keep-image and cancellation, scene context conversion, one-step undo/redo,
shared assets, layering, decoded pixels and physical save/reopen. Root CSS
color/opacity is checked against 20,000 decoded red pixels in each context.
There are zero captured console/CLI/window errors or ResizeObserver diagnostics;
bounded idle, cleanup and baseline restoration pass. The working vault remains
installed at the documented repository-local path.

A stale test-only context-menu node was demonstrated in a failed run. The test
now reacquires the current node and retains the strict visible/uncovered hit
test, with negative regressions for missing/covered/detached controls. No
production scheduling, event suppression or observer change was made. Failed
reports remain available in the plugin's ignored test work.

Plugin validation: 549 portable cases including 105 measured-source cases and
96 focused SVG cases; production/library builds and five bundle checks pass.
No new lint findings; the existing plugin view and ImageMenu import-order
findings are unchanged. Bundle: 5,042,947 bytes (199,933 bytes below target).

The menu now opens a system SVG chooser instead of a vault picker, entirely
plugin-side. Native tests require the chooser event after trusted menu input,
then use CDP file selection from outside the vault. Cancellation is explicitly
synthetic; physical OS-dialog navigation remains manual. The supplied mindmap
retains four branch colors, translucent fills, light root and 13 editable
labels through bounded SVG-local custom-property/fallback resolution. Each
context decodes 18,120 translucent-blue pixels, using an independent Canvas
reference for alpha quantization. No additional fork logic was needed.

The plugin's [feature guide](../../../obsidian-excalidraw-plugin/docs/SVG_CONVERSION_ENTRY_POINTS.md)
and [sanitized case/hash manifest](../../../obsidian-excalidraw-plugin/docs/testing-evidence/svg-entry-points/results.json)
record exact commands, source diff identities, artifact hashes and diagnostic
results. These are focused Windows main/popout results: the full 357-case
profile, physical mobile, other desktop hosts and restored/cold-start popouts
were not rerun. Advanced SVG CSS, fonts and effects remain approximations.
No release-readiness claim is made for the unpublished paired protocol checkpoint.
