# PR #499 remembered multiline paste

Fork parent `761b5165f3f659a4123ddeb4f712a0e1e343ae30`, incoming
`b55c9ee92e0cb81429041871d57fbbf10d1b443a`, and merge base
`5681e7d8be319092b13979e947afe632d5a4a525`. The base already includes
PR #498's web-app-only banner revert. Both files from that revert match
upstream. The Obsidian consumer is plugin `198b85d53a2af0df63380cbda070adac14fdc4ec`.

## Two-parent review

| Incoming path | Resolution and Obsidian contract |
| --- | --- |
| `packages/common/src/constants.ts` | Take the editor-local storage key. Keep the independent Obsidian font, toolbar, zoom, color and stroke constants. OBS-026. |
| `packages/excalidraw/components/App.clipboard.ts` | Adopt remembered split/join, NFC-aware wrapped text, frame and layer placement, undo and focus. Keep the file-aware, cancellable host callback, lazy Extras Mermaid fallback and zoom-aware size. Use the shared text factory for Markdown lines, which retain their original anchoring, spacing and per-line raw source. The phone keeps the existing one-time split action when embedded in Obsidian. OBS-009/011/021/022/024/026/030. |
| `packages/excalidraw/data/EditorLocalStorage.ts` | Take upstream's optional owning window unchanged. Existing callers can still omit it. The paste preference belongs to the editor's local storage and is outside persisted drawing and plugin settings. |
| `packages/excalidraw/locales/en.json` | Add both upstream toast labels alongside all five existing fork labels. Other locales continue to use the English fallback. |
| `packages/excalidraw/tests/clipboard.test.tsx` | Take the new upstream assertions alongside the existing file interception and raw Markdown assertions. Add independent fork source and built-browser coverage. OBS-033. |

The plugin's `ExcalidrawRoot` forwards `onPaste(data, event, files)` and
`ExcalidrawView.onPaste` inspects texts after insertion. Each link needs its
own text element because the plugin assigns one primary link per element.
An image-only line is replaced with the vault image. This depends on source
lines being split at insertion even when the ordinary paste preference is
unset, and rules out replacing this route with the upstream remembered split.
Plain paste still produces a single element. On Obsidian phones the manual
action continues to work without reading or writing the desktop preference.
No further customization has an equivalent upstream replacement in this PR.

## Validation

- The inherited compatibility harness passed all 28 selected clipboard cases.
  The fork-owned coverage run passed 261 tests, including two new clipboard
  cases. Full and owned TypeScript checks, focused lint and Prettier checks,
  and all 15 inventory checker tests passed. The ledger accounts for 298 paths.
- All 40 browser cases passed with zero browser errors. Both production and
  development verified remembered split and join in full and tray layouts,
  the one-time split in the emulated phone layout, and separate Markdown source
  lines in all three layouts.
- Windows Obsidian 1.15.1 (installer 1.14.5) passed the focused native main
  and popout cases in `excalidraw-auto-test`. A split in the main window
  changed the next popout paste, and rejoining in the popout cleared the shared
  preference. Trusted toast clicks and keyboard undo preserved focus and text.
  Wiki and Markdown links and a real vault image survived save and reopen.
  The coordinator passed its JavaScript error, source stability, popout
  cleanup and vault restoration gates. The fixture checks parsed links after
  reopen with link synchronization enabled. Earlier attempts with the default
  link setting or the uninitialized probe trace are retained in local reports.
  The separate same-artifact Extras check passed native MathJax, offline
  Mermaid and PDF export.
- Fork ESM, Obsidian artifacts and declarations, plugin production and
  development builds, and five plugin bundle tests passed. The production
  `main.js` is 4,884,891 bytes, SHA-256
  `49e1adebe64dac0b58e9fb1373a961b058939f4fa01c6b31828f695c8a1ca8e5`.
  All four runtime artifacts match the browser-tested files. The source
  fingerprint for the staged implementation and tests was
  `0c2e8559acdd890de2a240490325db0c1471d19825cd172b70808ce6f150f77d`,
  recorded before this documentation closeout. The native Extras revision
  was `2623016ab1bf0685911848748cf2d2f2d3e91d29`.

Local evidence is in `.test-work/pr499-owned-final` and
`.test-work/pr499-browser-accepted` in the fork, and
`.test-work/reports/pr499-native-5` in the plugin checkout. The native Extras
results and earlier probe failure are in `pr499-native-4`.

Physical phone, actual operating-system clipboard, and other native operating
systems are separate checks. The highest-value physical-device check is
tapping the one-time split action over the phone toolbar and confirming that
the next paste still starts as a single text element.
