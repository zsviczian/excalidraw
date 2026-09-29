# Decustomization backlog and review findings

**Decision for this handoff:** retain production behavior and compatibility. This patch documents and checks the fork; it does not remove runtime customizations. The strongest retirement opportunities are source-proven inert differences and local artifacts. Larger opportunities are conditional migrations to upstream behavior or plugin composition, not unsupported claims that upstream already replaces everything.

Scope is the supplied snapshots, with [provenance and limitations](README.md). “High confidence” below concerns the stated source observation; it does not mean an unexecuted build or Obsidian test passed. Owner roles and full implementation/consumer detail are in the [catalog](customizations.md); gate IDs refer to [validation.md](validation.md). Preserve retirement decisions under stable `OBS-xxx` IDs after the corresponding diff disappears.

## Recommended sequence

First make the existing package/test baseline trustworthy (F01, F02, F04), without mixing unrelated fixes into an upstream merge. Then land the independently reviewable no-op/artifact cleanup in D01–D04. Next replace remaining direct plugin discovery with semantic capabilities (F03) and reduce policy/presentation patches through D07–D15. Finally reassess package divergence and absent examples using real ancestry and consumer tests (D16–D17). Do not prioritize lines deleted over saved-data compatibility or reliable package delivery.

The first four items are the best initial retirement targets. They do not justify removing a whole behavior family. Public declaration-only helpers belong to D05, not the private-unused-code bucket.

<a id="d01"></a>
## D01 — Restore four comment/format-only files

**Priority P1; high-confidence inert source delta; OBS-036 (also OBS-013/011/024).**

The full upstream-to-fork differences in these files are comments/formatting only:

| File | Observed difference |
| --- | --- |
| [element/bounds.ts](../../packages/element/src/bounds.ts) | `zsviczian` comment on an otherwise identical expression. |
| [fonts/fonts.css](../../packages/excalidraw/fonts/fonts.css) | Four comments, not the implementation of embedded font delivery. |
| [data/filesystem.ts](../../packages/excalidraw/data/filesystem.ts) | TODO/newline, not a custom file-open path. |
| [EyeDropper.tsx](../../packages/excalidraw/components/EyeDropper.tsx) | Formatting rather than runtime logic. |

Restore each file byte-for-byte to the reviewed upstream version in a separate cleanup patch, retaining the useful reason/history here rather than as permanent merge noise. This can remove **four entire differing paths** without removing the font, clipboard, or eyedropper features implemented elsewhere. Recheck each full diff against the then-current merge base before applying; do not transplant these old upstream files over future upstream changes. Gate: exact diff/AST-equivalence review plus the ordinary lint/type/test lane (V02/V04/V06/V07 as affected).

<a id="d02"></a>
## D02 — Remove the ineffective WeakMap enumeration

**Priority P1; high-confidence no-op; OBS-019/036.** In [ShapeCache.destroy](../../packages/element/src/shape.ts), the added loop calls `Object.values()` on a `WeakMap`. Its weak entries are not enumerable object values, so the loop never deletes those entries. The existing keyed deletion is a separate operation and must stay.

A dependency-free Node probe during the audit constructed a WeakMap with one live key, ran the exact enumeration/deletion pattern, and observed `Object.values(...)` as `[]` with the original key still present. Remove only the ineffective added loop. Do **not** replace it with a global cache reset as an incidental “fix”: multiple live editors share a runtime, and cache ownership has separate lifecycle implications. Gate: keyed cache cleanup, independent live editors, repeated close/migrate, and late work (V03/V11).

<a id="d03"></a>
## D03 — Retire private unused parameter and orphan action metadata

**Priority P1/P2; strong static evidence, type/registration verification needed; OBS-028/036.** The private `ElementStore.add` in [transform.ts](../../packages/element/src/transform.ts) accepts an added `originalId?` parameter that is never read, with no supplied call passing it. Remove that parameter only; the **different** local `originalId` used later to rebuild ID mappings is active and must remain.

`toggleLaserPointerTool` appears in [actions/types.ts](../../packages/excalidraw/actions/types.ts) and [actions/shortcuts.ts](../../packages/excalidraw/actions/shortcuts.ts), including its `K` shortcut entry, but no registered implementation or action-name caller was found in the supplied fork/plugin sources. Review generated declaration/public shortcut exposure before removing this metadata. The actual laser tool, upstream tool shortcut, trails, and the plugin's `LASERPOINTER` settings are active and are not candidates for removal. Also run compiler/linter-based unused-import checks rather than assuming every suspicious import is unused from grep alone. Gate: V02/V07/V09, plus D05 if an externally exposed action name is being retired.

<a id="d04"></a>
## D04 — Remove unconsumed local artifacts

**Priority P1; high-confidence repository housekeeping, maintainer-purpose check; OBS-034.** [packages/excalidraw/npm](../../packages/excalidraw/npm) is an empty fork-only file; [dirtree-mine.txt](../../dirtree-mine.txt) is a non-UTF-8 tree dump. No runtime use was identified. Remove them after confirming they are not intentional maintainer inputs. This removes two fork-only paths, independently of production code.

The text-focused [repository exporter](../../scripts/generate-repository-zip.sh) is a different case: a root script actively calls it. It may remain as optional tooling, but its deliberate binary/font exclusions make it unsuitable for complete fork accounting. A hard-coded personal `repo:update` path can move to documented local tooling if desired, without treating it as a product requirement. Gate: V01 tooling/source-selection check; no plugin migration required for the two inert files.

<a id="d05"></a>
## D05 — Review declaration-only compatibility helpers, do not delete from grep

**Priority P2; no direct current caller identified, public risk unresolved; OBS-007/013/028/036.** [common/constants.ts](../../packages/common/src/constants.ts) exports `PRECEDING_ELEMENT_KEY`; [appState.ts](../../packages/excalidraw/appState.ts) exports `isLaserPointerActive`. Repository searches found their definitions but no active direct consumer. Neither should be equated automatically with a private implementation detail: package declaration subpaths may expose them.

The root `registerFontsInCSS` helper and root `getEmbedLink` alias lack an identified current direct plugin invocation, but have ambient/declaration/documentation evidence; `getEmbedLink` also has component-internal callers. Establish public support status and script usage before removing an alias. Where compatibility cost is small, keep a wrapper while modernizing its implementation. `getCSSFontDefinition` / `getContentLegacy` are **actively used** and are excluded from this candidate. Gate: declaration/API snapshot, plugin type/build and script fixtures (V01/V02/V06), explicit deprecation decision if public removal is proposed.

<a id="d06"></a>
## D06 — Keep public names, reduce implementation coupling

**Priority P2; architecture opportunity, not API retirement; OBS-007/029.** Many root bounds/text/order helpers are direct re-exports of upstream functions; history and z-order entry points dispatch upstream operations. Keep these thin while upstream moves ownership. Avoid copying an entire upstream file or reimplementing an algorithm merely to preserve an export name.

Locate the current upstream owner after an extraction and update the compatibility import/wrapper there. Selection/highlight timing, arrow recalculation, and text-container changes still need tests; an identically named upstream method is not automatically identical behavior. Gate: V02/V08, API/type snapshots and scripted selection, undo, ordering, bindings, and geometry.

<a id="d07"></a>
## D07 — Test whether `initState` can retire in favor of upstream initialization

**Priority P2; plausible upstream alternative, timing equivalence unproven; OBS-008.** `P: src/view/components/ExcalidrawRoot.ts` supplies starting appState through both `initialData` and fork `initState`; [App](../../packages/excalidraw/components/App.tsx) applies the latter synchronously in its constructor. Upstream already has `initialData` and initialization APIs.

Build a focused first-render/async-initialData test with host fonts, palette, tray, active tool, theme, restore and popout recreation. If upstream initialization produces the same observable state before host callbacks/rendering, stop the plugin from supplying `initState`, retain any necessary deprecated wrapper, then remove the fork-specific constructor merge. If it cannot, preserve a small explicit initialization hook rather than a broad state override. Gate: V02/V03/V05/V07; coordinate plugin change before component removal.

<a id="d08"></a>
## D08 — Separate host layout policy from upstream form-factor machinery

**Priority P2; partial overlap only; OBS-005/022.** Upstream already has `UIOptions.getFormFactor` and an editor-interface abstraction. The fork's [editorInterface.ts](../../packages/common/src/editorInterface.ts) returns host-preferred styles mode early and retains now-bypassed upstream logic; tray presentation, tablet/phone overrides, and desktop/mobile permission are broader than upstream form factor alone.

Move pure host preference decisions to the adapter/prop layer and reuse the upstream derivation for ordinary modes. Retain the smallest tray extension with explicit tests. Do not count dead-looking disabled upstream code as freely removable without preserving the required explanation and merge policy. Gate: V03/V07 across desktop/mobile/tablet, zero-width startup, fullscreen, sidebars, settings changes and popouts.

<a id="d09"></a>
## D09 — Consolidate zoom/navigation shims without losing preferences

**Priority P2; current upstream reuse is already substantial; OBS-028.** The fork zoom-to-fit wrapper already delegates to upstream viewport calculations. Preserve its host-facing max zoom/margin semantics and use upstream navigation for ordinary behavior. Host min/max/step, touch preferences, pointer-down ordering, and the `M` navigation path are separate policies.

Revert duplicated implementation only after proving the upstream path accepts the needed parameters and fires host callbacks in the same order. Right-button pan and `ownerDocument` existing upstream do not prove the complete input customization obsolete. Gate: V02/V03/V09 with mouse, pen, one/two-finger gestures, keyboard, minimum/maximum zoom, and callback ordering.

<a id="d10"></a>
## D10 — Consolidate presentation-only patches into host overrides

**Priority P2; useful merge-footprint reduction; OBS-024/026/027.** The fork already has [obsidianStylingOverrides.css](../../packages/excalidraw/css/obsidianStylingOverrides.css) loaded by the Obsidian entry. Evaluate scattered spacing, host icon colors, font/radius, tooltip, scrollbar, radio-control, and layout overrides for relocation there using existing upstream selectors/variables.

Keep only JSX changes necessary for real structure/semantics. CSS cannot substitute for portal ownership, access labels, a mobile menu, or a custom color algorithm. Restore accessible radio labels where appropriate and inspect the literal `fill="--icon-fill-color"` values in `ExcalLogo` and `playerStopFilledIcon`; unlike `var(--icon-fill-color)`, those do not reference the variable. Gate: V07 visual/accessibility checks in both themes and all host modes; full diff review must show which upstream files actually become identical.

<a id="d11"></a>
## D11 — Move default/export/theme policy to host initialization where equivalent

**Priority P2; narrow conditional retirement; OBS-008/032.** The default `exportScale` becomes `1` instead of device pixel ratio in [appState.ts](../../packages/excalidraw/appState.ts); host initialization/export calls may express that policy without changing the global default. Test main/popout displays with differing pixel ratios and all export entry points first.

[actionCanvas.tsx](../../packages/excalidraw/actions/actionCanvas.tsx) changes the `onThemeChange` early-return flow. The supplied plugin root actively passes that callback to `ExcalidrawView.onThemeChange`, which saves the theme, asynchronously reloads themed files, updates the tools panel and schedules dynamic styling. This is not an unused override. To retire it, first migrate the plugin to an explicit controlled-theme update that works with upstream's early return, then verify state publication, asset reload and callback ordering. Preserve the existing behavior until that coordinated migration passes. Do not merge this with locale ownership: avoiding mutation of the host document's `lang`/`dir` remains a separate valid integration requirement. Gate: V02/V03/V07/V10.

<a id="d12"></a>
## D12 — Narrow embed/URL policy through host rendering and validation

**Priority P2; security and merge-boundary improvement, not blanket removal; OBS-010/016/037.** Upstream already offers `renderEmbeddable` and `validateEmbeddable`. The fork adds webviews, HTML-data acceptance, HTTPS extraction, same-origin allowance, scale/magnification, and host menus. Some routing/presentation may migrate to the existing callbacks; saved scale and resize behavior still need component support.

Prefer explicit host capabilities for the exceptional URL paths instead of widening generic sanitizer behavior. Preserve vault embeds, Excalidraw scenes, PDFs, media, Mermaid images, and platform fallbacks. No exploitability claim is made from source inspection alone. Gate: V03/V04/V06/V08/V10 including hostile/malformed links, clipboard/drop, desktop webview versus mobile iframe, and old scenes. Migration must not silently break legitimate existing data-HTML drawings.

<a id="d13"></a>
## D13 — Consolidate Mermaid loading and isolate generic preview fixes

**Priority P2; implementation cleanup, active feature retained; OBS-030.** Host lazy conversion, shared engine ownership, and `customData.mermaidText` are active. [mermaid.ts](../../packages/excalidraw/mermaid.ts) and [obsidianUtils.ts](../../packages/excalidraw/obsidianUtils.ts) expose related loading helpers. `loadMermaidLib` is called by the wrapper and is **not** an unused helper.

Consolidate duplicate caching/loading responsibility behind the versioned service while preserving public exports and retry/error behavior. Evaluate generic preview/event fixes separately for upstream parity, rather than retaining an old preview component after upstream moves it. Do not reintroduce eager Mermaid or separate engine instances to match package dependencies cosmetically. Gate: V01/V02/V06, lazy Extras, failure/retry, offline operation, export and editable source metadata.

<a id="d14"></a>
## D14 — Move branded help/welcome content into host composition

**Priority P2; mostly presentation, hooks may need extension; OBS-031.** Help/shortcut content, welcome CTAs, host language/settings guidance and menu surfaces diverge in several components. Reuse existing upstream composition points and supply Obsidian-specific content from the plugin wherever possible.

Retain only the smallest extension where no upstream hook exists. Avoid losing accessible keyboard help or introducing a second hard-coded set of shortcuts. Gate: V07 plus host command smoke tests; prove each removed component patch has an equivalent host-rendered surface.

<a id="d15"></a>
## D15 — Reassess custom library download after platform tests

**Priority P2/P3; historical workaround, need environment evidence; OBS-021/031.** The library UI uses a direct encoded data-URL/download anchor rather than the upstream save path. Upstream already supplies library serialization and file-saving machinery, but the supplied snapshots do not prove that path works equivalently in Obsidian desktop/mobile/popouts.

Test save/cancel, filename/extension, permissions, document ownership, encoded payload handling and anchor cleanup and mobile export behavior. If upstream works, remove only the custom download implementation; preserve plugin library persistence and callbacks. If not, isolate the needed save capability rather than embedding platform detection in general UI. Gate: V03/V06/V07, with saved library round-trip.

<a id="d16"></a>
## D16 — Align build/declaration plumbing; retire stale scripts and proven-redundant overrides

**Priority P1 for validation defects; P2/P3 for simplification; OBS-002/003/004/034.** Retain fork package identity and the dedicated Obsidian IIFE lane. Reconcile the declaration/ESM issues in F02 using a clean built package and a consumer outside the monorepo. Minimize duplication between build configurations only after the four runtime artifact contracts remain intact.

The package's added `start`/`build:example` commands reference `scripts/buildExample.mjs`, absent from the supplied fork. Remove or repair these stale targets. Root `start:example` also points into the upstream-only script example tree (D17). Dependency resolutions/overrides and lockfile changes are not a license to remove security constraints: inspect why each exists, compare the actually resolved graph with the chosen upstream baseline, and run the relevant scanner/build before dropping it. Source comments do not establish current vulnerability status. Gate: V01/V02; no dependency update, install, publish, or version bump is part of this audit.

<a id="d17"></a>
## D17 — Review verified fork removals of upstream example trees

**Priority P3; current restoration need unknown; OBS-035.** There are 39 upstream-only paths: 17 under `examples/with-nextjs`, 21 under `examples/with-script-in-browser`, and `dev-docs/yarn.lock`. The upstream snapshot is the verified merge base of this fork. Fork commit `a385293bf` removed example configuration to fix `yarn.lock`, and `1d8b33260` removed the docs lockfile. This is not evidence of 39 required Obsidian customizations.

Inspect workspace/package history and current example dependencies before deciding whether to restore the trees. If an example is intentionally unsupported, keep root scripts/workspace configuration coherent; if restored, run its build. Do not restore a dependency lockfile from a different graph merely to shrink the byte count. Gate: V01 and the applicable example/doc build; record the current maintenance decision in OBS-035.

## Correctness, boundary and verification findings

These findings are **not** proof that their containing feature is obsolete. Fix them separately from retirement, preserving the relevant public/saved-data contract.

<a id="f01"></a>
### F01 — SVG frame width is populated from a fill color

**High-confidence source defect; OBS-015/018.** In [staticSvgScene.ts](../../packages/excalidraw/renderer/staticSvgScene.ts), a frame's `stroke-width` expression uses `element.customData?.frameColor?.fill ?? renderConfig.frameColor?.fill ?? FRAME_STYLE.strokeWidth`. A configured fill color can therefore become an invalid width value. Use the intended numeric width while keeping fill/stroke/name colors independent. Add an exported-SVG attribute test for global/per-frame colors and ordinary/marker frames; compare to canvas output (V08/V10). No visual runtime reproduction was performed in this audit.

<a id="f02"></a>
### F02 — Source manifest/build graph needs clean consumer verification

**High-confidence static discrepancies; released-artifact impact unverified; OBS-002/003/004.** The package's top-level `types` points to `types/excalidraw/index.d.ts`, and `gen:types` writes under `types/`, but conditional `exports` type paths still point under `dist/types/`. The unchanged ESM build script externalizes internal common/element/math packages whose dependency entries were removed from this fork's manifest; the dedicated IIFE builder bundles them through aliases instead. Broad declaration input inclusion also merits checking whether already-generated `dist` JavaScript is unintentionally included.

Inspect the actual clean tarball and test ESM imports and TypeScript resolution with no workspace symlinks/hoisting. Reconcile output paths and dependencies deliberately; do not assume top-level `types` overrides an incompatible conditional export. Existing published artifacts were not downloaded or inspected. Passing the IIFE smoke test would not resolve this finding. Gate: V01/V02.

<a id="f03"></a>
### F03 — Adapter and document isolation remain incomplete

**Observed source debt; behavioral/security impact requires focused tests; OBS-006/010/013/016/020/021/024/028/031.** [laserTrails.ts](../../packages/excalidraw/laserTrails.ts) reads `(window as any).ExcalidrawAutomate?.LASERPOINTER` settings directly, while `P: src/shared/ExcalidrawAutomate.ts` actively exposes the settings. Move the lookup behind a semantic, versioned host capability; do not remove the public getter or its settings.

Remaining runtime-global assumptions also exist in RTL queries in layer/tray UI, library download DOM, legacy font CSS helpers, WYSIWYG constructor checks, and the hyperlink tooltip structure. The generic tooltip's per-document change does not prove the hyperlink singleton isolated. Review each at its owning-document boundary while preserving main-window persistence. URL/same-origin exceptions (D12), radio accessible labels, and invalid icon fill-variable literals (D10) warrant separate checks. Gates: V02/V03/V04/V06/V07/V11. These are reasons to complete small adapters and generalizable owner-window fixes, not to roll back working multiwindow support.

<a id="f04"></a>
### F04 — Suppressed App test hooks weaken the claimed test baseline

**High-confidence source observation; test-suite impact not executed; OBS-033.** The fork comments out `App`'s upstream test-only `window.h` setup, while the component test harness accesses that hook. Determine and restore a test-only route compatible with the owning window; production Obsidian must not gain global test objects. Run the targeted and ordinary component suites before treating existing added test files as passing regression evidence. Gate: V02 and every affected test lane. No passing component suite is claimed in this handoff.

## Customizations not supported for retirement by this audit

Raw Markdown and legacy wrap restoration, saved custom pen/highlighter semantics, Local Font identity and active CSS-export loading, selective Markdown element IDs, marker-frame behavior, anchored/embed scale data, PDF/inversion metadata, awaited migration image work, awaited drop/file-aware paste hooks, private-runtime IIFE delivery, required offline fonts/lazy Extras, and typed host registries all have active consumer or persisted compatibility evidence. Owner-window scheduling/portal fixes remain necessary even though upstream already has an `ownerDocument` prop.

For these groups, the preferred path is a narrower adapter or a tested upstream contribution, not deletion. A future upstream implementation counts as a replacement only after checking the **same** saved representation, API shape, ownership/lifecycle, error behavior, and plugin tests. The goal is a small, understandable compatibility layer—not an artificially low diff count purchased by regressions.
