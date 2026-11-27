# PR #500 SVG font subsetting and clipboard preference

Fork parent `69d0b3c7e46bdb412bb13ebb0c34d61c1fd072f0`. Incoming
`f4e5226a3d84d51758e5967c23674f3671c11ea5`, with merge base
`b55c9ee92e0cb81429041871d57fbbf10d1b443a`. The three upstream commits refresh
the project documentation, move the paste choice into AppState and fix WOFF2
allocation ownership during SVG export.

## Two-parent review

| Incoming paths | Resolution and contract |
| --- | --- |
| Nine files under `.github/assets`, root `README.md`, package `README.md` | Adopt the repository artwork, banner-generation source and links verbatim. The new font files are banner assets, outside the shipped editor's font registry. |
| `CONTRIBUTING.md` | Retain the fork's contribution, fingerprinting, packaging and evidence rules. Update the upstream contribution link in that context. OBS-001. |
| `packages/common/src/constants.ts`, `packages/excalidraw/data/EditorLocalStorage.ts` | Adopt upstream's removal of the generic paste key and optional window arguments. Existing generic storage consumers use the original signatures. The hosted preference retains its existing key in `obsidianUtils.ts`. |
| `packages/excalidraw/appState.ts`, `packages/excalidraw/types.ts` | Adopt `splitOnPaste` with a `false` default for standalone hosts and export/server exclusion. Preserve the existing Obsidian state and type extensions. |
| `packages/excalidraw/components/App.clipboard.ts` | Standalone uses upstream AppState. Obsidian keeps the existing device-local choice in the shared runtime's main window because the plugin does not persist upstream's browser AppState as a shared user preference. Preserve the Markdown import, file-aware host interception, zoom sizing, Extras fallback and the one-time phone action. OBS-009/011/021/022/024/026/030. |
| `packages/excalidraw/subset/woff2/woff2-loader.ts` | Adopt upstream's `finally` cleanup verbatim. Compression and decompression hand callers a copied byte array, then release the Embind vector. The fork's compressed WASM packaging and main-thread caller remain in place. OBS-003/013/032. |
| Three application snapshots, `packages/excalidraw/tests/clipboard.test.tsx` | Adopt the incoming `splitOnPaste` assertions and snapshots. Run the standalone multiline suite without the test harness's fake Obsidian host. The host-aware tests still cover the retained preference and file/Markdown behavior. OBS-033. |

## Obsidian SVG font paths

- Drawing SVG export, including the padded-frame branch, goes through
  `P: src/utils/utils.ts#getSVG` to the fork's `exportToSvg` or `exportScene`.
  Exports can opt out with `skipInliningFonts` and drawing preview/autoexport
  paths can request embedded fonts. The component gathers used glyphs and
  embeds `@font-face` data URLs. The WOFF2 decode/encode stages use the fixed
  loader, including in the Obsidian bundle's offline main-thread path.
- `P: src/core/managers/FontManager.ts` registers the user-selected vault font
  as `Local Font` (ID 4), and the typed host supplies vault font bytes such as
  Xiaolai CJK subsets. Inline WOFF2 faces use the normal glyph subsetter. The
  fork's CSS branch embeds other inline font formats whole.
- Markdown rendered as SVG uses a separate path in
  `P: src/shared/EmbeddedFileLoader.ts`. It selects the note's configured or
  frontmatter font and uses `getCSSFontDefinition` for bundled faces or
  `P: src/utils/embeddedAssetUtils.ts#getFontDataURL` for vault assets. The
  legacy CSS path inlines whole font faces, with a system-font opt-out.
  MathJax CHTML rules also get their own data-URI font inlining for data SVGs.
  These whole-font paths retain their existing behavior through the merge.

## Validation

- The fork parent released neither mocked result vector. The merged loader
  released both and returned the same bytes. Four independent tests also
  check compression and decompression ownership when byte reads throw.
- The owned coverage suite passed 265 tests and the inherited harness passed
  all 28 selected clipboard tests. Both TypeScript checks, focused lint and
  15 inventory checker tests passed. The source ledger accounts for 299 paths.
- All 40 built-browser cases passed with zero browser errors. Both artifacts
  generated a browser-decodable 1,136-byte WOFF2 subset from the 56,156-byte
  Virgil face and returned the same subset bytes on a repeat export.
- The dedicated Windows Obsidian vault passed six feature cases: offline CJK
  font registration and pixels, repeated SVG subset byte parity and font
  decoding, and remembered paste with undo and vault links/images after save
  and reopen, each in the main window and a popout. Clipboard events used
  synthetic payloads and trusted clicks/keyboard input. Startup, JavaScript
  error checks, source stability, cleanup and baseline restoration passed.
- Fork ESM, Obsidian artifacts and declarations, plugin production and
  development builds, and all five plugin bundle checks passed. All four built
  browser artifact hashes match the native producer manifest. The production
  plugin `main.js` is 4,981,596 bytes, SHA-256
  `06189fc65e156bbd8f3ef00091abc8ef4341539b7c8d8b954183dc6ee51b8dd8`.
  The plugin checkout tests used `f88d78ea44fc85578c34caa74036959c732bb550`
  and Extras `2623016ab1bf0685911848748cf2d2f2d3e91d29`. The tested merge
  candidate `40e8ce6cfdb238e555c071f0f3e1f5e30502d992` differs from the final
  merge only in this review document.

Evidence lives in `.test-work/pr500-owned-final` and `.test-work/pr500-browser`
in the fork, and `.test-work/reports/pr500-native-2` in the plugin checkout.
On physical mobile, the highest-value check is to export the same text-rich
drawing repeatedly and open the SVG offline, including a vault `Local Font`
and CJK text. Physical mobile and long-run memory profiling were outside this run.
