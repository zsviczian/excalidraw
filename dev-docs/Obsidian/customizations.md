# Customization catalog

Read with the [complete file ledger](file-inventory.md), [contracts](contracts.md), and [validation matrix](validation.md). Stable IDs describe behavior, not original commits. Status and subsystem owner roles are indexed in [file-inventory.json](file-inventory.json). All decisions below are based on the supplied snapshots; no runtime removals were made in this audit.

## Architecture in one paragraph

The plugin loads an isolated component IIFE through `P: src/core/managers/PackageManager.ts`, installs common/component host adapters, and mounts `P: src/view/components/ExcalidrawRoot.ts` with an owning document and host callbacks. Fork-owned helpers (`commonObsidianHost`, `obsidianExcalidrawHost`, `obsidianText`, `obsidianUtils`, `ObsidianRadixPortal`, custom pen paths) provide the main separation. Remaining deltas reach into shared element factories, restoration, input, rendering, UI actions, and packaging because hooks alone do not cover saved-data semantics or all host lifecycle constraints. The cheapest long-term architecture preserves those narrow boundaries rather than maintaining parallel upstream engines.

<a id="obs-001"></a>
## OBS-001 — Fork policies and durable inventory

**Maintain.** [AGENTS.md](../../AGENTS.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md) replace the supplied upstream's short pointers with conservative fork/merge policies, fingerprints, typed host boundaries, private React and Mermaid constraints, package release gates, and cross-repository verification. Both now require this inventory to change with the implementation. `packages/excalidraw/CHANGELOG.md` also contains historical fork hook entries; its old text callback signatures are not the current API contract.

This is repository governance, not a runtime customization. Retain the policy differences, keep rules centralized, and use this catalog for evidence rather than copying another policy body into each entry. When retiring a difference, retain its stable ID, source/replacement, review reference, and validation. Do not infer history or accept a checksum as semantic review. **Gate:** inventory/checker validation and ordinary documentation diff review.

<a id="obs-002"></a>
## OBS-002 — Package identity and dependency graph

**Minimize, with packaging defects to investigate.** [Package manifest](../../packages/excalidraw/package.json), [root manifest](../../package.json), and [lockfile](../../yarn.lock) differ in package scope/version, source/types/files fields, build/publish scripts, overrides/resolutions, and development dependencies. The component removes `@excalidraw/common`, `@excalidraw/element`, and `@excalidraw/math` runtime dependencies, moves Mermaid to development dependencies, and adds Obsidian build tooling. Root tooling adds Yarn and local repository scripts. Override comments cite scanner findings; this audit does not independently certify vulnerability status or the compatibility of forced versions.

`P: package.json` pins `@zsviczian/excalidraw` `0.18.140`; `P: PackageManager.ts` consumes its `dist/obsidian` payload. The IIFE aliases workspace sources, but the **unchanged ESM builder still externalizes common/element/math**. Thus IIFE bundling is not evidence that removing those dependencies is safe for the published ESM package. Audit the packed dependency graph and consumer installs separately. Retain scope and host delivery; remove obsolete pins only after matching resolved upstream dependencies and relevant security/build evidence. Keep unrelated lockfile refreshes out of behavior patches. **Gate:** V01; backlog F02 and D16.

<a id="obs-003"></a>
## OBS-003 — Single-artifact Obsidian delivery

**Retain.** [buildObsidianPackage.js](../../scripts/buildObsidianPackage.js) and [obsidianEntry.ts](../../packages/excalidraw/obsidianEntry.ts) create one function-evaluable IIFE plus CSS per environment. The builder aliases workspace sources, externalizes private React/ReactDOM/JSX references, exposes `ExcalidrawLib`, disables runtime `import.meta.url` use, embeds required assets/fonts, resolves lazy CJK paths, and cleans only its own output directory. The entry adds Obsidian-only CSS without making it part of upstream's normal entry. Production/development source-map policies differ intentionally. [subset-main.ts](../../packages/excalidraw/subset/subset-main.ts) disables the external worker path.

`P: PackageManager.ts` evaluates the shared runtime and leases it to views; its assumptions are not satisfied by upstream's chunked ESM output or by a renamed UMD artifact. Required filenames, offline behavior, lexical React bindings, and prepack sequencing are specified in [contracts](contracts.md#artifact-contract). Keep the build isolated. Worker support alone does not make the worker override obsolete: an inline/blob worker would need a new offline/CSP/one-artifact design and validation. **Gate:** V01, V03, V06, V11. No generated output was built or inspected in this audit.

<a id="obs-004"></a>
## OBS-004 — Declarations and build-time dependency boundaries

**Review and narrow.** [tsconfig-types.json](../../packages/excalidraw/tsconfig-types.json) emits declarations into `types/`, unlike inherited package export entries pointing into `dist/types/`. Its aliases, target, JS inclusion, and exclusions also differ from the upstream declaration path. Other differences are the explicit sibling easing-function inclusion, base-project exclusions, a Buffer/ArrayBuffer assertion in `data/encode.ts`, exported `UnbrandForValue`, and a local branded-type identity implementation in [math/range.ts](../../packages/math/src/range.ts) to avoid a runtime common/math cycle. `index-node.ts` also supplies the fork's required rawText field.

Consumers include plugin imports/ambient declarations and normal ESM consumers, not just the IIFE. Do not call the declaration layout correct merely because a source typecheck passes. Verify all `exports.types` targets inside an actual tarball, module resolution from a clean consumer, and absence of unintended compiled-JS input under `dist/` in the separate type config. The math change is an upstreamable dependency-graph fix rather than inherently Obsidian behavior. Restore upstream implementation only when its import graph no longer recreates the cycle. **Gate:** V01, V02; F02, D16.

<a id="obs-005"></a>
## OBS-005 — Common host capability registry (protocol 1)

**Retain.** [commonObsidianHost.ts](../../packages/common/src/commonObsidianHost.ts) holds a version-checked structural adapter with token-based, idempotent, stale-safe disposal. [commonObsidianUtils.ts](../../packages/common/src/commonObsidianUtils.ts) supplies standalone defaults and normalizes invalid UI mode values. Capabilities cover device/platform flags, desktop/per-form-factor UI preference, maximum canvas dimensions/area, and contrast highlight color. `common/index.ts` exposes the boundary.

`P: src/core/managers/obsidianCommonHostAdapter.ts` implements this from live plugin/device information and settings; `PackageManager.ts` registers it. Upstream has editor-interface and renderer primitives but no Obsidian capability contract in this snapshot. Keep plugin classes and globals out of common/element internals. Add generic upstream hooks where appropriate, then let this adapter provide host policy. A future protocol change requires coordinated registration/disposal tests and the consumer handoff, not an unversioned assumption that package and plugin always match. **Gate:** V02, V03, V07, V09.

<a id="obs-006"></a>
## OBS-006 — Excalidraw host service registry (protocol 2)

**Retain.** [obsidianExcalidrawHost.ts](../../packages/excalidraw/obsidianExcalidrawHost.ts) is the analogous version-2 boundary for settings, vault font loading, shared Mermaid, semantic commands, translations, and inline link suggestions. [obsidianUtils.ts](../../packages/excalidraw/obsidianUtils.ts) turns settings into focused accessors. Services that need a host fail explicitly; settings have defined standalone defaults. Registration does not import Obsidian or the plugin.

`P: src/core/managers/obsidianExcalidrawHostAdapter.ts` reads settings at call time, translates `anyFile`/`LaTeX`/`card` into plugin actions, and attaches the plugin's suggester. Keep synchronous settings live after registration; avoid snapshotting them or passing the whole plugin object. The remaining laser-pointer global is **not** covered by this registry and is separately recorded under OBS-028/F03. Generic typed callbacks are a useful upstream direction; simply removing the adapter would break text input and host services. **Gate:** V02, V03, V04, V06.

<a id="obs-007"></a>
## OBS-007 — Public props, imperative methods, and library exports

**Preserve public contracts; simplify internals.** [types.ts](../../packages/excalidraw/types.ts), [index.tsx](../../packages/excalidraw/index.tsx), and [App.tsx](../../packages/excalidraw/components/App.tsx) expose the fork's hooks, early state, webview/diagram/menu controls, history operations, view/layout helpers, image readiness, selection/z-order/geometry methods, and additional library exports. The complete extension list and callback semantics are in [contracts](contracts.md#component-extension-surface).

Direct consumers are `P: ExcalidrawRoot.ts`, `ExcalidrawView.ts`, `ExcalidrawAutomate.ts`, `src/constants/constants.ts`, `EmbeddedFileLoader.ts`, and public script/type documentation. Public exports such as `getEmbedLink` and `registerFontsInCSS` have no current direct plugin runtime call found, but do have exposed declarations/documentation; they are not deletion-safe. Many extra exports re-export **unchanged upstream algorithms**, not bespoke algorithms to remove. Upstream already has `setViewport`, `getEditorInterface`, `renderEmbeddable`, and other generic APIs. Prefer making old entry points thin wrappers around them while preserving parameters, timing, selection, and return values. `AppClassProperties.setSelection` is an internal App helper, not an added member of the published imperative object. **Gate:** V02–V05, V08–V10; D05, D06, D09.

<a id="obs-008"></a>
## OBS-008 — Host AppState and synchronous initialization

**Minimize, preserving host state.** [appState.ts](../../packages/excalidraw/appState.ts) adds palette, link opacity, custom pens/current stroke/reset snapshot, pinned scripts, gesture/context flags, grid direction/colors, highlight-search flag, dynamic styles, frame role/colors, and marker rendering flags. It retains numeric `currentItemStrokeWidth` beside upstream's width key and sets default `exportScale` to 1 rather than device pixel ratio. Storage rules explicitly keep most host-only options out of browser/server/export persistence; the legacy width and current frame role have browser storage entries. `actionClearCanvas` preserves a selected subset of host configuration. Zoom is no longer excluded from the observed UI state, and LayerUI memoization reflects it.

`App` spreads `initState` into constructor state. `P: ExcalidrawRoot.ts` supplies the same starting appState through both `initialData` and `initState`; later settings/theme/pen paths update state through the imperative API. Upstream `initialData` is a credible replacement only after verifying **first-render/async restore timing**, not merely matching object contents. Export scale is also a candidate for host initialization instead of a global default. Preserve arbitrary script-supplied stroke widths and clear/reset semantics. **Gate:** V02, V03, V05, V07, V09; D07, D11.

<a id="obs-009"></a>
## OBS-009 — Raw Markdown text lifecycle

**Retain saved-data compatibility.** [obsidianText.ts](../../packages/excalidraw/obsidianText.ts) and [App.text.ts](../../packages/excalidraw/components/App.text.ts) separate raw Markdown from parsed display/original text before editing and submission, recalculate dimensions, and coordinate link synchronization. Factories, conversion, clipboard, search placeholder text, embed placeholders, fixtures, and restore preserve `rawText`; `hasTextLink` is independent of an explicit link. Upstream's supplied restore path explicitly deletes legacy rawText, so taking that side loses an active host contract. `legacyTextWrap` in [textElement.ts](../../packages/element/src/textElement.ts) preserves old ellipse/diamond text geometry.

`P: ExcalidrawView.ts` implements the callbacks and raw/display workflows; plugin scene-data parsing, Markdown links, and scripts depend on stable element content. WYSIWYG attaches the host inline suggester, closes it on submission, adjusts caret and scaled width, and recognizes host panels to avoid ending editing prematurely. Upstream `originalText` alone is not an equivalent representation of raw Markdown plus rendered content. Keep the helper boundary and all creation/restore paths aligned. A migration would need explicit legacy-file fixtures and round-trip guarantees, not a field rename. **Gate:** V04, V08, V10.

<a id="obs-010"></a>
## OBS-010 — Obsidian links, suggestions, and link presentation

**Retain, review broad URL exceptions.** [Hyperlink.tsx](../../packages/excalidraw/components/hyperlink/Hyperlink.tsx) attaches the host suggester, listens for native input mutations, adds the mobile host search action, and suppresses upstream element-link UI. Link handles, tooltips, hit testing, and icon rendering also recognize `hasTextLink`; hover is forwarded to the plugin. Bound-text actions move/merge links onto containers instead of leaving duplicate ownership. [common/url.ts](../../packages/common/src/url.ts) accepts empty values, extracts an embedded HTTPS URL, and bypasses sanitization for `data:text/html`.

`P: ExcalidrawRoot.ts` supplies `onLinkOpen`, `onLinkHover`, and mobile `insertLinkAction`; `ExcalidrawView.ts` handles Obsidian navigation/hover. Upstream `onLinkOpen` is reused, not a fork invention. Data-HTML acceptance and broad same-origin embedding are capability/security decisions, not safe generic sanitizer improvements; move host-specific resolution behind a typed policy/render callback where equivalence can be proven. `hasTextLink`, raw text, link preview, and container-link behavior must survive any UI migration. **Gate:** V04, V06, V08; D12, F03.

<a id="obs-011"></a>
## OBS-011 — Drop and paste interception

**Retain.** [App.clipboard.ts](../../packages/excalidraw/components/App.clipboard.ts) passes parsed files as a **third** `onPaste` argument before native insertion. `App` invokes/awaits `onDrop` and stops the upstream path only when it returns `false`; thrown errors are caught/logged. [data/blob.ts](../../packages/excalidraw/data/blob.ts) tolerates a missing `DataTransferItem`, which occurs for host tab drags. Text paste also retains raw text and adjusts font sizing.

`P: src/view/managers/DropManager.ts` and `ExcalidrawView.ts` handle vault files, host draggables, and the public EA `onDropHook`; `ExcalidrawRoot.ts` wires these callbacks. The supplied upstream onPaste contract lacks the file list and there is no equivalent onDrop prop. A plugin DOM listener is not automatically equivalent because payload availability, await/cancel behavior, and insertion ordering matter. The difference in `data/filesystem.ts` is only a TODO/newline, **not** an alternative file-open implementation. **Gate:** V04, V06; D01 for that unrelated comment.

<a id="obs-012"></a>
## OBS-012 — Element IDs and restoration compatibility

**Retain, with restoration behavior independently testable.** [random.ts](../../packages/common/src/random.ts) introduces an eight-character alphanumeric ID. Factories and duplication use it selectively for Markdown-addressable text/linked and other applicable elements; line/freedraw and some duplicate paths still use upstream IDs. Do not describe it as a global replacement of every ID. [restore.ts](../../packages/excalidraw/data/restore.ts) also defaults fork fields, retains the Mermaid tool, does not import legacy image `strokeSharpness` into roundness, permits Local Font picks without static metadata, and warns rather than errors on malformed restoration.

Its added `pruneOrphanGroupIds` counts nondeleted group members and removes groups with at most one such member, including group IDs found on deleted elements. This is a distinct repair policy, not just rawText support. Consumers are `P: src/shared/ExcalidrawData.ts`, scene-data utilities, EA element creation, and saved vault drawings. Upstream has restoration and group repair but identical semantics were not established here. Any change must preserve block/element references, deterministic restore expectations, deleted-element/undo behavior, and old drawings. **Gate:** V04, V08; no blanket ID or restore cleanup authorized.

<a id="obs-013"></a>
## OBS-013 — Local fonts and host font loading

**Retain.** Local Font numeric ID **4** is a persistent/public identity, not a spare upstream font slot. [Fonts.ts](../../packages/excalidraw/fonts/Fonts.ts) exposes registration/loading helpers, allows local-font replacement, filters unrelated host font loads, and ensures an empty scene can load the welcome font. It avoids registering/checking the changing local face like ordinary static fonts. [ExcalidrawFontFace.ts](../../packages/excalidraw/fonts/ExcalidrawFontFace.ts) asks the host for vault fonts first, accepts whole-face CSS data, and supplies `getContentLegacy`. `obsidianUtils.ts` exposes metrics, family enumeration, local registration, scene font loading, CSS registration/definitions, and filename-based vault delegation.

`P: src/shared/EmbeddedFileLoader.ts` and `src/core/settings.ts` actively call `getCSSFontDefinition`, which uses `getContentLegacy`; `src/constants/constants.ts` exposes its library binding. Its name is **not** evidence of obsolescence. `registerFontsInCSS` itself is publicly declared/documented even though no current plugin runtime call was found. Required fonts/Assistant are bundled by OBS-003; CJK is the deliberate lazy-path exception. The four added comments in `fonts/fonts.css` do not implement bundling and can be retired independently. Browser-specific checks, global document use in legacy CSS registration, and empty-scene behavior need targeted coverage rather than wholesale reversion. **Gate:** V01, V03, V04, V06; D01, D05.

<a id="obs-014"></a>
## OBS-014 — Custom pens and highlighter rendering

**Retain saved stroke semantics.** [obsidianTypes.ts](../../packages/excalidraw/obsidianTypes.ts), [freedrawPath.ts](../../packages/element/src/freedrawPath.ts), and [easingFunctions.ts](../../packages/element/src/easingFunctions.ts) implement pressure, easing, cap/taper, outline/background, and custom-pen settings. `App` captures options in element `customData`, handles constant pressure, inserts highlighters behind content, and renders a separate underlay. Static/new-element/SVG renderers preserve matching output and dark-mode colors. Generic freedraw-mode controls are suppressed for custom strokes. `actionFinalize` avoids forcing a freedraw loop closed.

`P: src/types/penTypes.ts`, plugin pen utilities/UI, and `ExcalidrawView.ts` supply presets/current stroke/reset state; existing drawings persist stroke options. Upstream already supports freedraw, pressure, and stroke variability, but that is not equivalence to this saved custom options schema or highlighter layering. Retain the isolated stroke implementation and keep narrow renderer calls; evaluate generalizable features upstream without reinterpreting old stroke data. API width compatibility is separately OBS-026. **Gate:** V05, V09, V10, including canvas/SVG parity and overlapping translucent strokes.

<a id="obs-015"></a>
## OBS-015 — Marker frames and frame presentation

**Retain, fix a separate export defect.** Factories assign sequential padded frame names and retain `frameRole: "marker" | null`. Marker frames are outlines/regions, not containers: frame membership, hit detection, creation, resize, and `actionToggleFrameRole` keep them from capturing members; converting to marker releases existing members with undo support. Rendering supports independent marker-name/visibility flags, dashed marker outlines, and global/per-frame stroke/fill/name colors. Export explicitly filters marker frames and disables marker rendering, including in embedded exported scene data.

`P: src/shared/Dialogs/InsertPDFModal.ts`, frame/slideshow utilities, and `ExcalidrawAutomate` workflows use marker regions. Standard upstream frames capture/clip content and do not supply this role contract. Do not migrate by treating marker frames as ordinary frames. `actionFrame` also echoes the current theme, a narrowly testable historical workaround. In `staticSvgScene.ts`, frame `stroke-width` incorrectly reads a **fill color** before its numeric fallback; that is F01, not evidence that all frame customization should go. **Gate:** V08, V09, V10; existing role test checks membership and undo, not full export parity.

<a id="obs-016"></a>
## OBS-016 — Webviews, rich embeds, and embed magnification

**Retain with explicit boundary/security review.** [element/embeddable.ts](../../packages/element/src/embeddable.ts) adds data-HTML embedding, Obsidian YouTube wrapper routing on desktop/iOS, and unconditional same-origin allowance where upstream is selective. `App` tries the host `renderEmbeddable` path, then chooses webview or iframe with special handling for srcdoc/generated and Vimeo cases. It exposes embed-node lookup, forced rendering of offscreen embeds, and an active-embed menu. Embedded element scale changes DOM content resolution/magnification independently of its scene bounds; canvas border/SVG dimensions and radius/padding accommodate it.

`P: ExcalidrawRoot.ts` passes `renderWebview` on desktop, custom embeddable content, and menu rendering. Plugin vault/PDF/media cards and export workflows consume the behavior. Upstream already supports custom `renderEmbeddable`; a host-owned fallback renderer is therefore a plausible migration, but must cover visibility, srcdoc/video, focus/lifecycle, scaled snapshots, and PDF gestures. Broad `allowSameOrigin` is not needed merely because the host can render one trusted embed: narrow it by capability and document trust decisions. No exploit was tested or asserted here. **Gate:** V03, V06, V09, V10; D12.

<a id="obs-017"></a>
## OBS-017 — Image loading, replacement, and migration readiness

**Retain.** [element/image.ts](../../packages/element/src/image.ts) accepts an image factory so decoding occurs through the editor's owning `Window.Image`; pending promises carry cancellation. `App` handles image-cache cancellation on pending-image replacement/unmount, stops late post-decode mutation after unmount, and adds `awaitImageFiles`. That method waits on the relevant currently pending cache promises using settled results; it is not a promise that every future image decode or final canvas paint has completed. Binary file records retain source `name`, support forced replacement of an existing ID, and accept a call-scoped trusted-SVG normalization bypass.

`P: ExcalidrawView.ts` uses `awaitImageFiles` and `skipSvgNormalization` in migration batches; plugin asset loading depends on refreshed bytes at stable file IDs. The bypass is a `ReadonlySet<FileId>` argument, **not persisted trust metadata**. Upstream addFiles and ownerDocument support do not supply equivalent replacement/readiness behavior in these snapshots. Keep the public array addFiles form compatible. Test cancellation, rejection, existing IDs, SVG treatment, and popout closure mid-load; avoid a global cache flush that harms other mounted roots. **Gate:** V03, V06, V10, V11.

<a id="obs-018"></a>
## OBS-018 — Image inversion, canvas limits, and export fidelity

**Retain saved render metadata.** Element/canvas/SVG renderers use host canvas area/dimension limits, PDF/SVG-with-bitmap metadata, SVG dark-mode opt-out and bitmap inversion flags, and a device-specific iOS workaround rather than only upstream Safari detection. SVG symbol IDs distinguish images with different inversion modes and crops, preventing incompatible render variants from sharing the same symbol. Frame/pen/scale data is forwarded through the corresponding render configs.

`P: src/shared/EmbeddedFileLoader.ts`, `src/shared/ImageCache.ts`, PDF utilities, and element custom-data utilities produce or preserve the metadata. A universal dark-mode filter would not match mixed bitmap/vector/PDF assets. Upstream already renders images and SVG; retain only the host-specific transformations around that pipeline. Keep signed scale, cropping, PDF rotation, large-canvas fallback, and dark/light canvas/export results consistent. Actual device limits come from the adapter, not from assuming all current browsers share a limit. **Gate:** V06, V09, V10; no environment-specific limit claim was independently benchmarked.

<a id="obs-019"></a>
## OBS-019 — Teardown and shared-cache cleanup

**Review; some code is demonstrably inert.** `App.componentWillUnmount` adds aggressive clearing/nulling of references, canvas/scene-related data, events, and image work, including type-suppressed assignments. Focus/visibility guards and deferred callbacks interact with this teardown. These changes support `P: PackageManager.ts`/view-root migration in a shared runtime, but the amount of manual nulling is not itself proof of effective cleanup. Some guards still query a document-wide `.excalidraw`, not the particular root.

[ShapeCache.destroy](../../packages/element/src/shape.ts) adds `Object.values(elementWithCanvasCache)` followed by deletion. The target is a `WeakMap`, its entries are not enumerable through `Object.values`, and no own properties supplying entries were found. A Node micro-check confirmed the added loop leaves an entry present. Remove that **loop only** in a separate cleanup; resetting a shared cache globally is not an equivalent fix. Upstream keyed deletion already exists. Test teardown through repeated main/popout migration and late callbacks before retiring any non-inert cleanup. Test-hook suppression is a separate validation problem under OBS-033/F04. **Gate:** V03, V11; D02.

<a id="obs-020"></a>
## OBS-020 — Owner-window animation and scheduling

**Good upstream candidates, still required here.** [renderer/animation.ts](../../packages/excalidraw/renderer/animation.ts) changes the scheduler from a single global queue into per-window scheduler state; each animation/timer retains its creating scheduler. rAF, timeout, cancellation, idle state, and resets use that ownership. `throttleRAF`, batched throttled React callbacks, pan/scrollbar movement, and animated trails accept/propagate the owner window. InteractiveCanvas uses the supplied owner DPI instead of global `window.devicePixelRatio`. Renderer computed styles are also owner-window based.

`P: PackageManager.ts` can share one evaluated runtime across views in different windows, while `ExcalidrawRoot.ts` mounts a stable ownerDocument per root. The supplied upstream's ownerDocument prop is useful but **does not already include these scheduler changes**. Browser-wide singletons can stall or cross-cancel another window when the main one is backgrounded. Generalize these fixes upstream and retire duplicate fork hunks only when source ownership and cancellation semantics are equivalent. Trail coordinate offsets remain a separate embedded-layout requirement. **Gate:** V03, V11; focused tests assert independent animation progress and schedule/cancel behavior.

<a id="obs-021"></a>
## OBS-021 — Owner-document portals, tooltips, and drag ghosts

**Retain; upstream generic realm fixes where possible.** [ObsidianRadixPortal.tsx](../../packages/excalidraw/components/ObsidianRadixPortal.tsx) portals selected Radix content to the owning body to escape Obsidian's offset containing block. A `display: contents` bridge carries classes and live CSS custom properties/color; a layout effect avoids stale theme values, and an owning ResizeObserver mirrors hidden tabs without unmounting popup content. Tool, property, dropdown, and modal-origin history controls use that bridge and travelling classes/collision boundaries/outside-click rules.

`Tooltip.tsx` isolates nodes, timers, observers, and warm state per document. Top-picks drag helpers create ghosts, DOMRect, computed styles, listeners, and timers in the source realm. Hyperlink tooltips retain an active owner, but still use a singleton active-tooltip state rather than the generic tooltip WeakMap. `IconButton`/dropdown attribute changes address duplicate tooltips separately from realm ownership. `P: ExcalidrawRoot.ts` and view/popout lifecycle make these requirements observable.

Do not delete the bridge just because upstream offers a portal container: the containing-block, visibility, and inherited-theme problems remain. Generic realm fixes are upstream candidates; a host-specific bridge may remain. Some other touched paths still use global constructors/documents (WYSIWYG, RTL layout, library download); this inventory does not certify complete multiwindow isolation. **Gate:** V03, V07, V11; F03.

<a id="obs-022"></a>
## OBS-022 — Tray layout and host device/UI preferences

**Minimize while retaining the tray.** [common/editorInterface.ts](../../packages/common/src/editorInterface.ts) adds tray styles mode, lets host device/preference override upstream derivation, guards zero-width layouts, permits mobile mode to be disabled, and reduces the sidebar breakpoint. Early returns leave upstream preference derivation/loading bodies unreachable. `App` exposes layout refresh/setter helpers and avoids destructive zero-dimension resize behavior. [TrayMenu.tsx](../../packages/excalidraw/components/TrayMenu.tsx), LayerUI, Actions, MobileMenu, toolbars, dropdowns, and styles implement the top/bottom tray, full shape-action panel, phone preference, stats, pen/library controls, and sidebar offsets. `openMenu: "shape"` and the tray action support it.

`P: obsidianCommonHostAdapter.ts`, plugin settings, `ExcalidrawView.ts`, and `ExcalidrawRoot.ts` supply UI preferences. Upstream already has responsive full/compact/mobile interfaces and `UIOptions.getFormFactor`; those should stay the structural owner rather than be duplicated. They do **not** implement this tray mode. Move what can be represented by public configuration to the plugin and keep only a narrow tray/preference extension. Test phone/tablet/desktop preferences independently of viewport size and touch capability. **Gate:** V03, V07; D08.

<a id="obs-023"></a>
## OBS-023 — Host commands and context-menu integration

**Retain the semantic integration; reduce UI patch surface.** [ImageMenu.tsx](../../packages/excalidraw/components/ImageMenu.tsx) supplies system-image, vault-file, card, and LaTeX items through host `runAction`/`getLabel`; desktop, tray, mobile, and mobile-overflow menus reuse it. `ContextMenu` inserts host JSX with the current elements/appState/onClose. `App` respects host/global and per-state context-menu suppression, with the navigation-only `M` shortcut deliberately opening the canvas menu at the latest pointer coordinates even when ordinary touch context/pan paths would block it. Upstream element-link actions are hidden in Obsidian.

`P: obsidianExcalidrawHostAdapter.ts` and `ExcalidrawView.ts` own the commands/menu content; `ExcalidrawRoot.ts` wires the renderer. Preserve mobile overflow ordering, cancellation of selection, key event realm, and menu close semantics. `renderTopRightUI` and composition slots are existing upstream capabilities worth using for future UI additions, but they are not a direct replacement for pre-action context menu injection or image-tool overflow integration. **Gate:** V04, V07, V09.

<a id="obs-024"></a>
## OBS-024 — Host CSS isolation and dynamic styling

**Consolidate, not blanket revert.** [obsidianStylingOverrides.css](../../packages/excalidraw/css/obsidianStylingOverrides.css) is loaded only through the Obsidian entry and neutralizes host styles for controls, modals, radio inputs, text carets, layouts, embeds/PDF cards, left-handed mode, hidden elements, and mobile safe areas. Other component SCSS/TSX changes adjust icon-fill variables/assets, typography/spacing, pixel versus rem sizes, sidebar/toolbar positioning, hover contrast, and tooltip/modal positioning. Toolbar class names are prefixed to avoid host collisions. `dynamicStyle` propagates from state to the root, Dialog/Modal, and portal containers.

Consumers include `P: ExcalidrawView.ts` theme updates, custom embed renderers, plugin CSS, and Obsidian themes. Pure CSS replacements are plausible candidates to move into the isolated override file; doing so can restore many upstream-owned files without losing host behavior. But portaled elements no longer match trigger-ancestor selectors, so preserve travelling classes, stacking, theme variables, and specificity. Some override selectors escape `.excalidraw` scoping and one rule is marked unused; confirm real DOM and themes before removal. Suppressing a radio `aria-label` needs accessibility justification, not a “theme fix” assumption. **Gate:** V03, V07, V09; D10, F03.

<a id="obs-025"></a>
## OBS-025 — Custom palettes and sticky-note color semantics

**Retain, upstream-compatible where possible.** Host `colorPalette` supplies regular stroke/background/canvas palettes and five top picks. [colorTargets.ts](../../packages/excalidraw/actions/colorTargets.ts) intentionally preserves upstream sticky-note-specific top picks and shared ink; mixed selections use host regular picks. `actionProperties` keeps independently styled bound text unchanged when recoloring a non-sticky container, but maintains upstream sticky single-ink behavior. Bucket and canvas fill use host choices too. ColorPicker treats tray as a full palette, handles missing hotkey mappings/invalid top-pick inputs, outlines light shades, and defaults canvas background to shade zero.

`ColorInput` adds a native color chooser, resolves named colors through `COLOR_NAMES`/tinycolor, and preserves alpha. `P: plugin settings`, `ExcalidrawView.ts`, and EA palette APIs supply these values. Upstream top-pick customization/color targeting is already reused; do not duplicate it or override sticky-note semantics wholesale. The named-color dictionary may be consolidatable with the installed parser after exact alias/alpha tests, but was not proven redundant here. **Gate:** V05, V07, V09; existing colorTargets tests exercise host palettes and sticky/mixed selections.

<a id="obs-026"></a>
## OBS-026 — Font picks, extended sizes, and legacy stroke widths

**Retain compatibility; evaluate UI simplifications.** Constants/FontPicker/tests expand the default top-pick capacity from three to four (adding Lilita One); Local Font has a custom icon. `actionProperties` adds an extra-small size and five stroke widths, and accepts an arbitrary historical numeric width until a key-based choice clears it. Font-size buttons use modifier-driven zoom scaling and Fibonacci/normal size tables; creation/paste call `getFontSize` to preserve that choice. These mode flags are module-scoped, which matters when one runtime serves multiple roots.

`P: src/utils/excalidrawAutomateUtils.ts` explicitly bridges legacy numeric stroke widths, and `ExcalidrawAutomate.ts` reads them. Old drawings and scripts therefore rule out deleting the legacy field just because upstream adopted width keys. Four picks are a UI preference, not an intrinsically different font engine. Prefer upstream configurable counts/sizes when available, but verify reorder persistence, modifiers, caret preservation, and multiple-root behavior. Do not remove font ID 4 under this entry. **Gate:** V04, V05, V07, V11.

<a id="obs-027"></a>
## OBS-027 — Grid, selection, and overlay presentation

**Minimize around upstream renderers.** [staticScene.ts](../../packages/excalidraw/renderer/staticScene.ts) supports independent horizontal/vertical grid lines, regular/bold colors, dark-mode color treatment, link icon opacity and text-link affordances. Interactive rendering adds host-aware contrast highlights, stronger search-result emphasis, and thinner selection/binding outlines/handles. Search emphasis persists until selection changes. Renderer state selectors forward the required host fields; scrollbar gray and frame presentation are additional narrow visual differences. [CanvasGridSize.tsx](../../packages/excalidraw/components/Stats/CanvasGridSize.tsx) adds a grid-size editor beside upstream's **gridStep** editor.

`P: ExcalidrawView.ts`, common-host highlight capability, and EA selection/grid workflows drive these settings. Upstream has a grid and selection visuals, but the supplied controls do not make `CanvasGridSize` redundant: size and step are different state properties. A generic parameterized upstream grid control could replace that small copied component. Consolidate renderer knobs into upstream render configuration only when dark-mode and per-root ownership are preserved. **Gate:** V07, V09, V10.

<a id="obs-028"></a>
## OBS-028 — Zoom, pen/touch gestures, and navigation

**Minimize, preserving input ordering.** Zoom step/min/max and fit ceiling come from host settings; the fork default step is smaller. `zoomToFitElements` already delegates to upstream `zoomToFitBounds` with a legacy margin conversion, ceiling, and no step snapping. Wheel handling uses composedPath and an optional reversed modifier policy. Touch changes include pen-mode single-finger panning, double-tap eraser, configurable pinch behavior, active-PDF gesture suppression, and disable-double-click-text **creation** without blocking editing existing text. Pen cursor behavior, view-mode double-click forwarding, context-menu suppression during movement, and keyboard handling are additional deltas.

`App` moves pan startup after cursor/pointer bookkeeping so the plugin can observe pointer-down events during panning; upstream's earlier pan check has different collaboration/pointer semantics. Right-button pan itself is already upstream. `P: host settings adapters` and `ExcalidrawView.ts` consume these differences. [laserTrails.ts](../../packages/excalidraw/laserTrails.ts) still discovers `window.ExcalidrawAutomate.LASERPOINTER`, which `P: ExcalidrawAutomate.ts` exposes as live laser settings. Move that internal read through the typed boundary while preserving the public EA getter; absence of a direct import is not proof of no consumer. **Gate:** V03, V09, V11; D09, F03.

The fork also retains `toggleLaserPointerTool` in the action-name/shortcut maps (`K`), but no registered action implementation or call site for that action name was found in either supplied repository. This is a bounded metadata-cleanup candidate, not evidence that the active laser tool or its settings are unused. See D03/D05.

<a id="obs-029"></a>
## OBS-029 — Selection, line editing, and geometry API adapters

**Preserve public adapters, favor upstream internals.** `App` exposes history undo/redo, selection and z-order wrappers, line editor entry, container resizing, arrow-binding refresh, and scene-point color sampling. Selection resolves groups and bound text; `setSelection` is an internal App helper. `refreshAllArrows` in `obsidianUtils` recalculates arrow binding geometry and cache/capture state; `updateContainerSize` delegates to exported element resize calculations. `forceFlushSync` optionally flushes AppState updates for host ordering. Additional input changes favor unlocked hits over locked ones, protect selection while the mobile context menu is open, and avoid a synthetic touchscreen line adjustment when no segment exists.

`P: ExcalidrawAutomate.ts`, scene-data utilities, and `ExcalidrawView.ts` consume these methods; the latter calls `getColorAtScenePoint` and `forceFlushSync`. Extra root exports often expose upstream geometry functions directly. Reuse upstream actions/viewport/selection machinery rather than maintaining equivalent algorithms, but preserve capture/undo timing, group semantics, locked elements, and legacy public signatures. The private unused `ElementStore.add` parameter is a separate safe cleanup candidate, not a reason to delete these adapters. **Gate:** V02, V08, V09, V10; D03, D06.

<a id="obs-030"></a>
## OBS-030 — Host Mermaid conversion and editable diagram metadata

**Retain the host boundary; upstream general rendering fixes.** [MermaidToExcalidrawLib.ts](../../packages/excalidraw/components/TTDDialog/MermaidToExcalidrawLib.ts) obtains the host's lazy Extras-backed library, caches only a ready instance, permits retry after enablement, queues conversions, and returns converted elements/files or an error. Generated image elements retain `customData.mermaidText`; the dialog seeds text from a selected Mermaid image. TTDDialog replaces the package dynamic import, guards late results after unmount, and closes when the host library is unavailable. Paste and generated-text validation use the shared host API. App accepts a Mermaid tool/render option and preserves selection where required.

`P: ExcalidrawRoot.ts`, Mermaid utilities, host adapter, EA conversion APIs, and the optional Extras integration consume these paths. `useMermaidRenderer` retains the latest content while another render is running and rerenders when the library becomes ready; these are plausible generic upstream fixes. Always-on preview is a separate keyboard/layout workaround, and the support-oriented example is branding, not a loader requirement. `loadMermaidLib` and `loadMermaidToExcalidrawLib` are both reached; consolidate their shared loading logic without dropping public `loadMermaid` or retry/queue behavior. **Gate:** V06, V07, V10; D13.

<a id="obs-031"></a>
## OBS-031 — Help, welcome screen, and library workflows

**Good host-composition candidates.** Help buttons/menu text and destinations point to plugin documentation, issues, and the Visual PKM channel. Welcome Heading accepts color/message, and menu layout is denser. The library browse control adds a localized tutorial; `LibraryMenuHeaderContent.onLibraryExport` replaces upstream `saveLibraryAsJSON` with a global-document data-URL anchor using a fixed Obsidian filename. The Mermaid starter example also promotes plugin support.

`P: ExcalidrawRoot.ts` composes custom welcome and menu content. Upstream already exposes `WelcomeScreen`, `MainMenu`, and related composition slots, making branding a realistic candidate to move into the plugin. Keep any public Heading props as compatibility shims until their consumers migrate. The library export replacement needs a platform test before upstream restoration; a file-download workaround is not justified or obsolete solely by its age. Existing upstream library URL/referrer flow remains in use. **Gate:** V06, V07; D14, D15.

<a id="obs-032"></a>
## OBS-032 — Theme notifications and host locale ownership

**Retain document isolation; reassess notification overrides.** [i18n.ts](../../packages/excalidraw/i18n.ts) lowers translation eligibility from 85 to 66 and stops changing the containing document's `lang`/`dir`, avoiding mutation of the whole Obsidian application. Fork locale additions label extended stroke/font/frame controls. `actionToggleViewMode` calls the host before changing state. `actionToggleTheme` continues its own update even after invoking `onThemeChange`, unlike upstream's early return. `actionFrame` explicitly includes the current theme in its result.

`P: src/view/components/ExcalidrawRoot.ts` actively passes `onThemeChange` to `ExcalidrawView.onThemeChange`, which updates saved scene theme, asynchronously reloads themed files, updates the tools panel and schedules dynamic styling. The callback is not unused. Restoring upstream's callback early return requires an explicit plugin-controlled theme update and ordering tests; preserve both notification and component-state behavior until that migration is proven. Also ensure a frame action cannot reset the theme before removing its theme echo. Translation threshold is a product preference that could become host configuration. Do not restore whole-document lang/dir mutation while embedded in Obsidian. **Gate:** V03, V07, V08; D11.

<a id="obs-033"></a>
## OBS-033 — Fork regression tests and fixture adaptations

**Retain and verify the test lane.** Added tests cover both host registries, raw-text lifecycle, marker role/undo, and body-portal visibility/theme. Existing tests gain owner-window animation, drag/tooltip/image readiness, clipboard file/raw-text, palette, and WYSIWYG assertions; font-count and accessibility selectors change with their UI contracts. Text fixtures and helpers include rawText. The [validation matrix](validation.md) maps exact files to intended assertions and missing end-to-end evidence.

`App` also comments out upstream `window.h`/test-hook initialization. Standard component tests access that test hook; until test setup is verified/restored with an Obsidian-runtime-safe guard, tests' presence is not evidence of an executable passing suite. Restore upstream test-only behavior where possible without polluting production or another editor's runtime. No component tests or builds were run in this audit because dependencies/Obsidian were not provisioned. Only the new inventory checker tests and static/document validations are claimed. **Gate:** V02 and all affected focused lanes; F04.

<a id="obs-034"></a>
## OBS-034 — Repository export and local workflow artifacts

**Cleanup candidates, not product behavior.** Root scripts add `repo:export` and a machine-specific `repo:update` rsync from `~/Downloads/update/`. [generate-repository-zip.sh](../../scripts/generate-repository-zip.sh) creates a filtered, text-focused archive excluding images/fonts/binaries and many directories. `.gitignore`, package `.gitignore`, and `.nvmrc` support local export/deploy/Node setup. The fork also contains a non-UTF-8 `dirtree-mine.txt` tree dump and an empty `packages/excalidraw/npm` file.

No runtime consumer of the tree dump or empty file was identified; both can be considered for a separate housekeeping removal. Export tooling may be useful but its output is **not a complete source snapshot** and must not become the sole inventory baseline. Missing example-build script targets in the package manifest need confirmation/removal or restoration, not invocation under the assumption they exist. Keep local convenience commands isolated from publishing. **Gate:** source/reference scan and V01 for changes to manifest scripts; D04, D16.

<a id="obs-035"></a>
## OBS-035 — Upstream-only examples and documentation lockfile

**Verified fork-tree removals; restoration purpose still needs review.** The fork lacks the complete `examples/with-nextjs/` and `examples/with-script-in-browser/` trees present at the verified upstream merge base, and lacks `dev-docs/yarn.lock`. The ledger includes all 39 paths, including example binaries. Commit `a385293bf` removed example configuration to fix `yarn.lock`; commit `1d8b33260` removed the documentation lockfile. These are repository-maintenance differences, not 39 required Obsidian features.

Review the surrounding workspace and dependency history before restoring examples or the docs lockfile. Prefer retaining upstream examples/docs when they do not violate a host constraint, especially to test the preserved ESM package contract, but do not reinstate a lockfile from another dependency graph or obsolete tooling merely to shrink the diff. **Gate:** repository/dependency review and relevant example/ESM validation; D17.

<a id="obs-036"></a>
## OBS-036 — Comment-only, formatting-only, and inert differences

**Highest-confidence decustomization targets.** Four complete file differences have no functional code delta: `element/bounds.ts` adds a fingerprint to an identical return; `fonts/fonts.css` adds four comments to unchanged source values; `data/filesystem.ts` adds a TODO and changes the final newline; `components/EyeDropper.tsx` only reformats a cursor object. Restoring these files from the supplied upstream can remove four changed paths without removing a host feature. Relocate a still-useful historical note into the relevant catalog entry rather than keeping a code conflict alive for it.

The added WeakMap enumeration loop is inert (OBS-019). The private `ElementStore.add(originalId?)` parameter is unused (OBS-029). Definition-only exports `PRECEDING_ELEMENT_KEY` and `isLaserPointerActive` need broader public/type-surface checking before removal even though no call sites were found in the supplied repositories. A no-op proof is stronger than “old comment” or “no direct plugin import”; keep that distinction in review. **Gate:** byte/source diff, reference/type scan as applicable, and narrow validation; D01–D05.

<a id="obs-037"></a>
## OBS-037 — Anchored images and embed-aware resizing

**Retain persisted geometry semantics.** [resizeElements.ts](../../packages/element/src/resizeElements.ts) prevents ordinary single-element resizing of `customData.isAnchored` images and preserves anchored dimensions during multi-element transforms, while positions can still change. For iframe/embeddable elements, Shift/aspect-ratio resizing adjusts content magnification through the saved scale tuple instead of treating it like a flipped bitmap. The helper exported for `App.updateContainerSize` preserves upstream dimension calculations around these exceptions.

`P: src/utils/excalidrawViewUtils.ts` sets anchoring; `src/utils/utils.ts` reconciles source asset scaling; `ExcalidrawAutomate.ts` creates anchored images. These are active consumers and saved-data behavior, not redundant generic locked-element handling. Upstream locking and aspect-ratio preservation are not the same as “move the anchored item but keep its intrinsic dimensions” or “resize the embed's content scale.” A plugin-side implementation would need an appropriate pre-transform hook and matching undo behavior. **Gate:** V08, V10; test single/multi selection, signed scale, and embedded content sharpness.
