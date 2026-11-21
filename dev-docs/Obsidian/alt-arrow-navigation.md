# Alt/Option+Arrow and core Obsidian shortcuts

Status: **reproduced and fixed in the plugin**. The component navigation algorithm remains unchanged from upstream, including [PR #12646](https://github.com/excalidraw/excalidraw/pull/12646).

Read-only inspection of the reported drawing and its matching installed build identified core Obsidian editor:swap-line-up/down bindings on Alt+Up/Down. Those commands consume the keys before the canvas receives them. Existing user overrides covered only Alt+Left/Right. Private snapshots remain ignored locally; the personal drawing, plugin and hotkey settings were not modified.

## Targeted correction

The plugin's isCanvasFlowchartNavigationShortcut identifies a ready editable owning canvas with exactly one live selected element and an unmodified Alt+Arrow event. It excludes text fields, property popups, dialogs, other documents, modified chords, loading/migrating views and active editing/resizing.

registerHotkeyOverrides installs a high-priority wildcard root-scope handler. It returns true only for eligible canvas navigation, allowing Excalidraw to receive the event. Other input returns undefined and continues to existing handlers; key-specific registrations cannot decline a matching key this way. The existing popScope lifetime unregisters the new handler, which reads the current active view.

There is no settings migration, public API, host protocol, component runtime, saved-data or dependency/version change. The fork branch adds artifact coverage only. This core-Obsidian conflict needs no additional upstream PR.

## Verification

- Both main and popout fail Alt+Up with the reported core bindings before the production edit. Cleanup/source stability pass: this is the genuine product negative control.
- The same cases pass after the plugin fix in Windows Obsidian 1.15.1 (installer 1.14.5). They cover 24 pointer-selected labeled-node direction/layout checks in full/tray/compact, explicit Alt keydown/keyup, unchanged node positions, repeated root registration, drawing → Markdown → drawing transitions, and actual Markdown Alt+Up/Down line movement. Existing color/panel/toolbar/context-menu/Undo/save and strict error/cleanup checks remain intact.
- All 38 production/development artifact browser cases pass, including 48 plain/labeled pointer-selected navigation checks. All four locally rebuilt artifacts match the tested browser hashes and installed plugin inputs exactly.
- All 829 plugin fast cases, five bundle contracts, changed-source lint and feature/test inventories pass. The 292-path fork audit and all 15 checker tests pass.

Earlier clean-config investigation is retained in the results. Invalid initial arrow geometry was a fixture error, not a product negative control. Pointer readiness and host-layout setup failures were corrected without weakening assertions. An earlier TTD opening-animation geometry failure is preserved; final browser runs pass its unchanged assertions.

The fixed main.js is 4,842,001 bytes (+709), SHA-256 f4f212b501b055c23b4a09389b8150f2ab8f1583171caa5e3af663f9c41918f2. Deployment was only to the repository-owned automation vault. The maintainer Messages.ts edit remains untouched. The maintainer subsequently authorized committing, pushing and merging both branches; component publication/versioning remains maintainer-owned. The fork CI comparison now uses the already-reviewed upstream 2c3dcc06e baseline rather than its stale earlier pin.

See [source hashes, matching artifacts and before/after reports](alt-arrow-navigation-results.json). This is focused validation, not complete release acceptance. Manual follow-up: install/reload the rebuilt plugin, select a node in the reported drawing, try Alt/Option+Up/Down, and confirm ordinary Markdown line movement. Physical macOS Option input remains separate coverage.
