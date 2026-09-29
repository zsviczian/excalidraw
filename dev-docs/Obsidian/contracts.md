# Integration and compatibility contracts

This is the compatibility index for the [customization catalog](customizations.md). It describes the supplied source snapshot, not a newly designed API. The linked TypeScript definitions remain authoritative for complete types and optionality. `P:` paths refer to the supplied Obsidian plugin repository, as explained in [README.md](README.md).

## Three different compatibility boundaries

**Internal host protocol.** The plugin and evaluated component runtime register structural capability adapters. Protocol changes can be coordinated across the two repositories with explicit version rejection. They must not expose plugin classes, a raw settings object, a view instance, or undocumented global discovery.

**Public component and scripting surface.** The fork's root exports, imperative API, and the plugin's ExcalidrawAutomate surface may be used by community scripts absent from these snapshots. An empty repository search is not deprecation evidence. Preserve a small compatibility wrapper where possible; removing a method requires a public migration decision, not just a protocol bump.

**Persisted drawing data.** Vaults, embedded scene data, old exports, element references, and library contents outlive a plugin release. Old fields cannot be deleted merely because current creation paths no longer write them. Restore, edit, undo, duplicate, serialize, and export must retain their intended meaning. The plugin's public scripting and saved-data policies apply separately from internal adapter cleanup.

<a id="artifact-contract"></a>
## Runtime and delivery contract — OBS-002/003/004/019/020/021

[buildObsidianPackage.js](../../scripts/buildObsidianPackage.js), [obsidianEntry.ts](../../packages/excalidraw/obsidianEntry.ts), the [package manifest](../../packages/excalidraw/package.json), and `P: src/core/managers/PackageManager.ts` define the delivery boundary. The required runtime artifact names are:

```text
packages/excalidraw/dist/obsidian/excalidraw.production.min.js
packages/excalidraw/dist/obsidian/excalidraw.production.min.css
packages/excalidraw/dist/obsidian/excalidraw.development.js
packages/excalidraw/dist/obsidian/excalidraw.development.css
```

The JavaScript is a single IIFE per environment with no runtime chunk graph. React, ReactDOM, and JSX-runtime dependencies resolve through the plugin's private runtime bindings, not bundled duplicate React or ambient `window.React`. The host stylesheet is loaded through the dedicated entry. Required fonts, including Assistant, are embedded; the intentional lazy CJK path must be verified separately. Font subsetting uses the non-worker path. Mermaid is provided lazily through plugin Extras rather than bundled as a second eagerly initialized engine. A browser having `Worker` support does not eliminate the offline asset-delivery constraint.

Normal ESM output and declarations remain required alongside the Obsidian artifacts. A working IIFE alone does not prove the package can be consumed through `exports` or its declaration graph. The source-level declaration-path and external-dependency discrepancies are recorded as [F02](decustomization.md#f02); do not consider those verified packaging behavior.

The plugin shares an evaluated runtime across editor roots. Each editor has a stable `ownerDocument`; moving to a different document means recreating that editor, not mutating its ownership in place. Owner-document DOM, constructors, animation frames, timers, portals, and image decoding must not accidentally attach to the runtime's original window. Conversely, plugin persistence deliberately belongs to the main-window storage boundary. A popout DOM fix must not migrate storage ownership. Closing one view must not cancel another view's work or clear another runtime registration. Teardown and migration must prevent late callbacks from reviving an unmounted editor. See V01, V03, and V11 in [validation.md](validation.md).

## Host registries — OBS-005/006

Both registrations are scoped to the evaluated package module, not to individual views. Both reject a mismatched `protocolVersion` and return an idempotent disposer protected by a unique token: disposing an older registration must not clear a newer one. The adapter implementations read relevant settings at call time rather than permanently capturing their initial values.

### Common host, protocol 1

Canonical definition: [commonObsidianHost.ts](../../packages/common/src/commonObsidianHost.ts). Consumer adapter: `P: src/core/managers/obsidianCommonHostAdapter.ts`.

| Capability | Purpose and fallback boundary |
| --- | --- |
| `getDeviceInfo()` | Desktop/mobile/phone/tablet and OS flags, or `null`, without importing Obsidian. |
| `getDesktopUIMode()` | Host choice of desktop presentation. |
| `getPreferredUIMode(formFactor)` | Semantic UI preference for the requested form factor. Helpers normalize invalid modes and supply standalone behavior. |
| `getCanvasLimits()` | Device-sensitive maximum canvas area and dimension. Standalone helper defaults are 16,777,216 area and 32,767 dimension. |
| `getHighlightColor(background, opacity)` | Host-aware highlight/contrast color; standalone fallback remains available. |

[commonObsidianUtils.ts](../../packages/common/src/commonObsidianUtils.ts) is the normalization/default layer. Preserve fake-host tests, standalone calls without a host, live settings, invalid-mode normalization, version rejection, and stale disposal.

### Excalidraw host, protocol 2

Canonical definition: [obsidianExcalidrawHost.ts](../../packages/excalidraw/obsidianExcalidrawHost.ts). Consumer adapter: `P: src/core/managers/obsidianExcalidrawHostAdapter.ts`.

| Capabilities | Meaning |
| --- | --- |
| `isDoubleTapEraserEnabled()`, `isPenModeCrosshairVisible()`, `isSingleFingerPanningEnabled()`, `isDoubleClickTextEditingDisabled()` | Input preferences. |
| `getZoomToFitMaxLevel()`, `getZoomStep()`, `getZoomMin()`, `getZoomMax()` | Zoom preferences and limits. |
| `isContextMenuDisabled()`, `shouldSyncElementLinkWithText()` | Host interaction/link policy. |
| `loadFontFromFile(filename)` | Promise of vault font bytes or `undefined`; not a view or file-system object. |
| `getMermaid()` | Promise of the host converter service, loaded lazily. |
| `runAction("anyFile" \| "LaTeX" \| "card")` | Narrow host commands rather than discovery of a plugin instance. |
| `getLabel(key)` | Host-owned labels. |
| `attachInlineLinkSuggester(inputEl, widthWrapper?, container?, suppressPlaceholder?)` | Returns `ObsidianKeyBlocker`, with `isBlockingKeys()` and `close()`; caller owns closing it. |

[obsidianUtils.ts](../../packages/excalidraw/obsidianUtils.ts) delegates service/settings calls. Optional standalone paths use documented defaults; host-required operations must fail explicitly rather than silently invent a plugin. The residual global laser-settings lookup is **not** part of this typed contract and remains F03 debt.

<a id="component-extension-surface"></a>
## Extra props — OBS-007/008/009/010/011/016/023/030/032

Canonical definitions: [types.ts](../../packages/excalidraw/types.ts), forwarding in [index.tsx](../../packages/excalidraw/index.tsx), execution in [App.tsx](../../packages/excalidraw/components/App.tsx), [App.text.ts](../../packages/excalidraw/components/App.text.ts), and [App.clipboard.ts](../../packages/excalidraw/components/App.clipboard.ts). `P: src/view/components/ExcalidrawRoot.ts` wires the host callbacks; `ExcalidrawView.ts` and `src/view/managers/DropManager.ts` implement the corresponding behavior.

| Fork addition/change | Contract that must survive migration |
| --- | --- |
| `initState?: AppState` | Synchronous constructor-state injection. The plugin also supplies initial appState via upstream `initialData`; matching data alone does not prove identical first-render timing. |
| `onBeforeTextEdit(textElement, isExistingElement): string` | Supplies editable raw text instead of assuming displayed text is the source. |
| `onBeforeTextSubmit(textElement, nextText, nextOriginalText, isDeleted)` | `nextText` is wrapped. Returns `{ updatedNextOriginalText: string, nextLink: string }`, not the historical tuple described in old changelog material. |
| `onDrop(event): boolean \| Promise<boolean>` | Awaitable pre-insertion host interception; `false` stops the native drop path. |
| Existing `onPaste(data, event, files)` gains `ParsedDataTransferFile[]` | Third argument is provided before native insertion; preserve upstream cancellation semantics and the nullable clipboard event. |
| `onViewModeChange(isViewModeEnabled)` | Notification used when view mode is toggled. |
| `onLinkHover(element, pointerEvent)` | Host hover preview/navigation integration. |
| `renderWebview?: boolean` | Electron webview rendering path; not a universal browser capability. |
| `renderEmbeddableMenu(appState): JSX.Element \| null` | Host embed control surface. |
| `renderMermaid?: boolean` | Enables the host Mermaid workflow. |
| `onContextMenu(elements, appState, onClose)` | Returns host JSX or `null`; `onClose` accepts an optional callback. |
| `insertLinkAction(linkVal)` | Host link/search action, including mobile link editing. |

Upstream already supplies `ownerDocument`, `initialData`, `onLinkOpen`, `renderEmbeddable`, `renderTopRightUI`, `theme`, `onThemeChange`, `UIOptions.getFormFactor`, and image insertion options in this snapshot. Their use by the plugin is **not** itself a fork customization. Prefer extending/reusing these surfaces where equivalent lifecycle and callback semantics can be established.

## Imperative API additions and changed semantics — OBS-007/017/022/028/029

The public object is assembled in `App.tsx` and declared in `ExcalidrawImperativeAPI` in [types.ts](../../packages/excalidraw/types.ts). A method on `AppClassProperties` alone is not proof of public exposure: notably, `setSelection` is not added to the public imperative object by this fork.

| Surface | Compatibility detail |
| --- | --- |
| `history.undo()`, `history.redo()` | Added alongside upstream `history.clear()`. Preserve history ordering and selection behavior. |
| `zoomToFit(...)` | Host-facing wrapper accepts target/max-zoom/margin inputs and delegates to upstream viewport calculations; it is not an independent complete zoom engine. |
| `refreshEditorInterface()`, `isTouchScreen()`, `setDesktopUIMode(...)`, `setMobileModeAllowed(...)`, `isTrayModeEnabled()` | Host UI/device controls; tray semantics exceed upstream form-factor selection. |
| `setForceRenderAllEmbeddables(force)` | Controls forced embed rendering; the current implementation forces state work when enabling it. |
| `getColorAtScenePoint({ sceneX, sceneY })` | Returns sampled color or `null`, including canvas/background fallback behavior. Used by plugin color tools. |
| `startLineEditor(...)`, `refreshAllArrows()`, `updateContainerSize(...)` | Host editing/geometry entry points. Preserve selection, point indices, binding, and text-measurement ordering. |
| `selectElements(elements, highlightSearchResult?)` | Optional transient search-result emphasis; selection uses synchronous state application with no captured undo entry. |
| `sendBackward(elements)`, `bringForward(elements)`, `sendToBack(elements)`, `bringToFront(elements)` | Select requested elements and dispatch the corresponding existing actions. Do not replace with independent index manipulation. |
| `getHTMLIFrameElement(...)` | Host access to a rendered iframe/webview. The public object adapts ID lookup; internal implementation also handles element lookup. Returned DOM belongs to its editor document. |
| `addFiles(files)` and `addFiles({ files, skipSvgNormalization? })` | Preserve the original array form. The optional `ReadonlySet<FileId>` certifies already-normalized host SVGs for this call only. Do not persist it or apply it indiscriminately to untrusted input. The current call forces replacement through `addMissingFiles(..., true, ...)`; the preceding old comment claiming existing files are never updated is stale. |
| `awaitImageFiles(fileIds)` | Snapshots currently pending cache promises, waits with `Promise.allSettled`, then yields a microtask. It does not wait for images submitted later, guarantee successful decode, or guarantee a browser paint. Plugin migration uses it to bound batches. |
| `updateScene({ ..., forceFlushSync? })` | Extra synchronous appState publication option. Observe actual state/selection timing when replacing it with an upstream API. |

`P: src/shared/ExcalidrawAutomate.ts`, `src/view/ExcalidrawView.ts`, and plugin view/asset managers are active consumers of these families. Compatibility names can remain even after their implementation becomes a direct upstream delegate.

## Extra root-library exports — OBS-007/013/029/030

The following are exposed by the fork's [root entry](../../packages/excalidraw/index.tsx) in addition to upstream's exports. Some merely re-export upstream helpers; public exposure, not a new algorithm, is the fork change.

| Family | Export names |
| --- | --- |
| Bounds, selection, geometry, text | `getCommonBoundingBox`, `getMaximumGroups`, `measureText`, `wrapText`, `getLineHeight`, `getFontString`, `getFontFamilyString`, `getBoundTextMaxWidth`, `intersectElementWithLine`, `refreshTextDimensions`, `getContainerElement` |
| Ordering and parsing | `syncMovedIndices`, `syncInvalidIndices`, `safelyParseJSON` |
| Fonts and palette | `registerLocalFont`, `getFontMetrics`, `getFontFamilies`, `registerFontsInCSS`, `getCSSFontDefinition`, `loadSceneFonts`, `getDefaultColorPalette` |
| Mermaid and embeds | `mermaidToExcalidraw`, `getSharedMermaidInstance`, `loadMermaid`, `getEmbedLink` |
| Host configuration | `configureObsidianCommonHost`, `OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION`, `configureObsidianExcalidrawHost`, `OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION` |

The registration interfaces/disposer types are exported by their defining host modules (and the common package index); this list does not assert that the component root directly re-exports every associated type. The plugin maintains corresponding ambient library declarations.

`registerFontsInCSS` and the root `getEmbedLink` alias have declaration/documentation evidence but no current direct plugin runtime invocation identified. `getEmbedLink` still has internal component callers. `getCSSFontDefinition` and its `getContentLegacy` path are actively consumed by plugin font/export loading. Those distinctions prevent a misleading “legacy/unused” deletion. Preserve public aliases or make an explicit deprecation decision; consider moving behavior behind upstream helpers without changing the surface.

## Persisted fields and identities — OBS-009/010/012/013/014/015/016/018/026/037

Canonical shapes: [element/types.ts](../../packages/element/src/types.ts), [obsidianTypes.ts](../../packages/excalidraw/obsidianTypes.ts), [types.ts](../../packages/excalidraw/types.ts), defaults in [newElement.ts](../../packages/element/src/newElement.ts), restoration in [restore.ts](../../packages/excalidraw/data/restore.ts), and export in [scene/export.ts](../../packages/excalidraw/scene/export.ts). Some `customData` keys are intentionally not rigidly typed in the base element definition.

| Data/identity | Meaning and retirement constraint |
| --- | --- |
| Text `rawText` | Markdown source separate from `text`/`originalText`; restored, edited, pasted, transformed, serialized, and exported. Upstream restoration in this snapshot removes legacy rawText, so a blind merge loses this contract. |
| Base `hasTextLink?`, ordinary `link`, text/container link ownership | Render and activate links encoded in text without inventing a duplicate explicit link. |
| `customData.legacyTextWrap` | Preserve historical ellipse/diamond text wrapping geometry. Requires old-file fixtures before retirement. |
| Selective eight-character alphanumeric element IDs | Markdown-addressable references; not all elements use this generator. Preserve old references regardless of the generator used for new elements. |
| Font ID `4` / Local Font | Persistent/public numeric identity used by host fonts and scripts. Preserve fallback, local replacement, export, and reload behavior. |
| `customData.strokeOptions` | Custom pen/highlighter settings and their nested pressure/easing/outline/cap/taper interpretation. Saved highlighters require the matching layered renderer and SVG path. |
| `frameRole?: "marker" \| null` | Marker frames do not capture members. They have separate presentation flags and are excluded from exported drawing content/embedded exported scene data. Ordinary frame and undo behavior must remain intact. |
| `customData.frameColor` | Per-frame `fill`, `stroke`, `nameColor` overrides, distinct from host render configuration. Preserve numeric SVG stroke width separately; F01 is a defect, not a new color contract. |
| Iframe/embeddable `scale: [number, number]` | Magnification independent of element bounds, including Shift-resize behavior. |
| `customData.isAnchored` | Image/embed-aware resize protection; exposed by plugin scripts. |
| Image `customData.pdfPageViewProps` | PDF view-box fields `left`, `bottom`, `right`, `top`, optional `rotate`; plugin PDF/image flows depend on the metadata. |
| Image `customData.doNotInvertSVGInDarkMode`, `customData.invertBitmapInDarkmode` | Case-sensitive inversion flags. Canvas and SVG must agree and avoid collisions when the same file has differing inversion use. |
| `customData.mermaidText` | Editable original diagram source, including the converted image/diagram workflow. |
| Binary-file `name` | Host file metadata retained through ingestion/restoration. |
| Legacy numeric `currentItemStrokeWidth` | Host/script bridge beside upstream width keys; not restricted to the five toolbar presets. Preserve numeric widths when mapping UI keys. |

`ObsidianPenStrokeOptions`, `ObsidianPenOptions`, `ObsidianPenStyle`, `ObsidianResetCustomPenState`, extended fill styles, and pen-type strings are canonically defined in the fork. `P: src/types/penTypes.ts` and the plugin pen menu alias those types instead of maintaining separate copies. Edit the canonical definitions and verify the plugin compilation in the same coordinated change.

Most palette, UI-mode, pinned-script, custom-pen selection, gesture, grid, highlight, dynamic-style, and frame-render settings are host-provided AppState, not automatically saved scene schema. The explicit storage configuration in [appState.ts](../../packages/excalidraw/appState.ts) determines which survive browser/server/export persistence. Do not infer persistence merely from a TypeScript property or inadvertently begin exporting host settings. Clear/reset and first-render initialization are part of the contract even for nonpersisted fields.
