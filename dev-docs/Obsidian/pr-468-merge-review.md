# PR #468 export API merge review

Reviewed 2026-10-18. Fork parent `efcd36513651c4dcab56dfd788677dc4dc2a474e`, incoming upstream `e1b7aacb356a492aa1e0fc6eb57b8896124027f0`, merge base `4c37956ba5f04ec342a9d9d5891a38f22c5b7b4e`. Consumer: plugin `3746c5903a08fb551b6777e0a4236315554e3eda`, exact dependency `0.18.143`, plugin manifest `2.29.0`. No dependency/version/publication or plugin source change.

## Three-way accounting

All 31 incoming paths were reviewed, including clean auto-merges. Resolve the modified/deleted browser example by retaining its existing deletion (OBS-035); restoring an isolated component would not restore the absent example workspace. Inspect the export conflict's base/fork/incoming blobs rather than choosing an entire side.

| Area | Preserved behavior / upstream adoption |
| --- | --- |
| `scene/export.ts` (OBS-009/015/018) | Adopt upstream `exportScene` sizing, state sanitization, formats and environment handling. Consolidate marker removal before shared bounds/render/SVG metadata instead of retaining separate raster/SVG filters. Keep marker decorations off, custom label color and rawText. Carry the host frame palette explicitly through config because sanitized scene state deliberately excludes it. |
| Public root and utils exports (OBS-007/018) | Upstream deletes the legacy public functions. Plugin `constants.ts`, `utils.ts`, package validation, diagram-to-HTML and community scripts still use them. Fork-owned `obsidianExport.ts` translates their options into the single upstream pipeline. Keep SVG scale/padding/background/theme, embeddables, font inlining, image reuse, PNG metadata, JPEG alias/quality, and both clipboard call shapes. A narrow environment hook preserves independent legacy canvas viewport/scale, native dimension truncation and max-size fallback. |
| `renderer/staticScene.ts`, `scene/types.ts` (OBS-014/015/018/027) | Adopt upstream whole-frame square clipping. Existing highlighter, grid, image and link render differences remain. The element SVG renderer is unchanged by this PR. |
| App/clipboard/export dialog/data/resave | Adopt upstream explicit export config; preserve all host props/APIs and selection/link interception. `getExportConfigFromAppState` also carries the host frame palette. |
| Mermaid/chart/library/publish previews, application AI and Node example | Adopt upstream call migration. Preserve Mermaid source metadata, host conversion and Node text rawText fixture. No change to lazy Extras loading. |
| Incoming tests, snapshots and changelogs | Adopt upstream changes; add independent compatibility coverage without the unavailable window.h harness. Restore unrelated randomized transform snapshots produced by test:update. |

No complete OBS ID retires. The shared upstream renderer replaces the old export implementation; the compatibility module contains option translation/encoding, not a duplicate renderer. Further removal of public calls would violate scripting compatibility. Existing SVG frame stroke-width defect F01 is deliberately outside this merge.

## SVG and link contract

The PR can change single-frame SVG structure (a square clipping group and a clip definition even when the frame is absent from the supplied element list), default dark frame-label colors, and sizing/normalization with the new options. Plugin normal SVG export supplies `exportingFrame: null`. Legacy options are translated explicitly, rather than relying on the newly ignored editor appState fields.

Real before/after linked-shape and mixed-inversion image SVG fixtures are byte-identical, including dimensions/viewBox, anchors, defs, symbols and use references. Preserve `-no-invert-svg`/`-invert-bitmap` identities consumed by EmbeddedFileLoader; the underlying SVG renderer is unchanged. Plugin internal-link exclusion still keeps external links. Through `ViewExportManager`'s real getSVG dependency, Markdown external links become ordinary URLs, wiki links resolve to the owned file, and `onUpdateElementLinkForExportHook` executes once with the correct host/linked file; its URL (including an ampersand) reaches the SVG anchor. No navigation was triggered.

Marker exclusion from embedded SVG remains. PNG metadata keeps its existing encoding/restoration behavior, including the historical difference from SVG marker metadata; this merge does not silently change that saved payload contract.

## Validation

- Obsidian production/development artifacts and generated declarations pass. Focused compatibility, wrap, selection and text checks: 35 tests pass across the focused invocations (10 new export, 9 wrap, 10 selection, 6 text). Formatting and focused ESLint pass.
- Required `yarn test:update`: 55 suites / 612 tests pass; 96 suites fail collection through the existing disabled createTestHook/window.h or missing topPicksDnD harness. Restore the unrelated transform snapshot updates. This is not a clean full-suite result.
- Full typecheck: 262 diagnostics in the existing test/stale-declaration areas, including incoming touched export/renderOverrides/stickyNotes tests. No diagnostics in the adapter, export pipeline or new compatibility tests. The artifact declaration build passes; full typecheck is not claimed green.
- Plugin production and development builds pass with existing warnings. Bundle checks: 4 pass. Final production main.js: 4,956,690 bytes, 286,190 below the 5,242,880-byte target.
- Exact installed production build, Obsidian 1.14.4/macOS: SVG/PNG/JPEG, padding, scale, independent viewport, max-size cap, dark mode, PDF marker bounds, frame palette, embedded fonts, EA SVG/PNG, image inversion IDs and link processing pass. Seeded PNG pixel digests and the SVG fixture markup match the previous installed runtime. Newly opened and reopened popout selection, SVG links/dimensions, PNG export and teardown pass, with no captured JavaScript errors and owned drawing/controller cleanup. Final installed main.js SHA-256: `3d2d029fb488b27949e258b9516cc2d71aac59a96c7773cf223c8c2bd8896393`.
- Native plugin:enable's CLI response stalled although the plugin loaded and commands registered. The local probe used asynchronous enablePluginAndSave and explicit readiness checks, preserving the enabled-plugin setting. Disposable drawings/controllers were cleaned up; no plugin data reset or dependency change.

Local evidence: `/tmp/pr468-obsidian-smoke/report.json`, `/tmp/pr468-baseline.json`, `/tmp/pr468-after.json`, focused/build/typecheck logs under `/tmp/pr468-*`. These are local validation artifacts, not committed source.

Limits: no full application restart, physical mobile, Windows/Linux run or complete external-network-disabled run. No universal zero-regression claim. Highest-value manual checks: export an existing complex drawing to SVG/PDF with linked labels and mixed bitmap/SVG images; export a selected frame in dark mode and inspect its border/label/clipping. These exercise existing files beyond the controlled fixtures.
