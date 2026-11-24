# PR #497 upstream paste and frame-group merge

Fork parent `21631c61bfd0723fb202aac3cc6d2e41f8996b2f`.
Merge base `9c2e462ec23e54c4cf0493328840d6a27191c674`.
Incoming `eaa7fa32a6645ae9da57eda548e838d0e2a024a1` includes
upstream #12718 and #12712. The consumer checkpoint is plugin
`198b85d53a2af0df63380cbda070adac14fdc4ec` (2.29.4), with Extras
`2623016ab1bf0685911848748cf2d2f2d3e91d29` for local native integration.

## Two-parent review

| Incoming path | Resolution and Obsidian contract |
| --- | --- |
| `packages/element/tests/frame.test.tsx` | Take the three upstream group-drag cases unchanged. They cover same-frame, cross-frame and outside-to-frame dragging. |
| `packages/excalidraw/components/App.selectionTool.ts` | Upstream changes the group update on pointer-up only. Keep the independent locked/unlocked pointer-down precedence for the plugin. Existing marker-frame membership guards stay in the element layer. OBS-015/029. |
| `packages/excalidraw/components/App.clipboard.ts` | Resolve the wrapping conflict using upstream's one-element paste, alignment and split transaction. Retain file-aware interception and cancellation before insertion, the offline Extras Mermaid promise/fallback, and the plugin's zoom-aware font size. Split Markdown imports containing links into individual source lines during insertion so the plugin's deferred paste reader can resolve each link and replace image-only lines. The Markdown path shares upstream wrapping and preserves the previous line layout. OBS-009/011/026/030. |
| `packages/excalidraw/components/LayerUI.tsx` | Forward the upstream action and timer identity through one toast. Full and compact keep their existing status stack. Tray and mobile use the same actionable toast in their existing toolbar layout, with the small companion changes in TrayMenu, MobileMenu and the fork stylesheet. Preserve plugin view/zen, RTL, sidebar and render callbacks. OBS-008/022/024. |
| `packages/excalidraw/components/Toast.scss` | Take the upstream button styling unchanged. |
| `packages/excalidraw/components/Toast.test.tsx` | Take the two upstream timer tests unchanged. |
| `packages/excalidraw/components/Toast.tsx` | Preserve upstream action, stable callback and timer key. Schedule and clear against the mounted toast's owning window so popping out or retiring an editor also owns the timeout. OBS-021. |
| `packages/excalidraw/locales/en.json` | Use the two upstream status strings and remove the obsolete shortcut message from English. Keep the five unrelated fork labels. Other locales follow Crowdin and use existing English fallback for the new keys. |
| `packages/excalidraw/tests/clipboard.test.tsx` | Keep the incoming layout, wrap, frame, undo and last-paste assertions, as well as the existing raw Markdown and host-file interception tests. |
| `packages/excalidraw/types.ts` | Take the optional upstream toast action. Preserve the three-argument paste callback and other host declarations. No host-protocol, stored scene or consumer dependency migration. |

The fork's two explicit clipboard `rawText` assignments retire. The old
paste loop overwrote the first assignment with the normalized original line.
Both upstream constructors now provide `originalText`, and the existing
`newTextElement` factory derives `rawText` from that unwrapped value. The
factory default also applies to text created by the split action. The
`rawText` field, older scenes and Obsidian's raw/display distinction remain
covered by OBS-009. The plugin's image classifier requires a complete
`![[…]]` or Markdown-image line and drawing text stores one primary link per
element. Moving Markdown splitting to the optional toast would skip that
paste-time processing.

## Validation scope

The changed workflows are plain and Markdown paste, toast focus and timing,
and group membership on frame drag. Focused source and actual-artifact
browser checks cover these paths. Native validation uses only the marked
repository-local automation vault. The plugin build consumes the four frozen
fork artifacts without publishing the package or modifying the dependency.

- 27 focused source tests passed. A wider inherited diagnostic produced
  81 passes, 30 skips and three failures. The same three inherited cases
  already fail on the fork parent. Two use a fake host that intentionally
  supplies no Mermaid runtime. The third is edge-to-edge frame creation.
- The ESM and Obsidian artifact builds and all five plugin bundle tests passed.
- The first native diagnostic passed 11 of 13 frame metadata/navigation/
  configuration cases. Both scene-image cases failed at selecting a
  frame for a preview, before dragging or clipboard input. The coordinator
  passed cleanup and restored the declared baseline.
- The incoming single-paste action and same-frame grouping assertions fail
  on the fork parent and pass in the merge. Focused lint reports zero
  errors and the same 15 warnings in LayerUI and MobileMenu as the
  parent. The full fork and owned-suite typechecks pass.
- All 40 built-browser cases pass, with no browser errors. Production and
  development both exercise paste, split, keyboard undo and separate Markdown
  source in full, tray and emulated phone layouts.
- The final macOS Obsidian 1.16.0 run passes six focused native cases in
  the main window and in a new popout. Each window exercises plain-text
  paste, a trusted click on the split action, keyboard undo, grouped drag
  within and across frames, and wiki links plus an actual image transclusion
  through save and reopen. The input probe uses synthetic clipboard events,
  trusted pointer and keyboard input, and waits for drag geometry before
  pointer-up. Earlier probe setup failures and the first main-window
  cross-frame timeout remain in the local reports. Error checks, popout
  cleanup and vault-baseline restoration passed on the final run.
- Consumer production and development builds pass. The final production
  bundle is 4,884,139 bytes, with 358,741 bytes of headroom. Its SHA-256
  is `3c38034c02758b4bf95d3fbb0066c12da0c3ef41fef44bf0a3dff77ee731b2ad`.
  All four installed component artifact hashes match the browser-tested
  artifacts. Production JS and CSS hashes are
  `b67e2f9f28375dd439d1648bffb6470e55a29e829274036c8b68044a99a68a79`
  and `1999fcb0ca04202168147b181f1470932955dc3c0878347b2aebd41e6227f4eb`.
- All 15 inventory checker tests pass. The workflow and ledger both pin
  the incoming upstream commit. The ledger accounts for 297 differing paths.
  The toast tests, toast stylesheet and frame tests match upstream byte
  for byte.

Physical mobile touch and OS clipboard integration remain unverified.
The highest-priority device check is tapping the split action above the
phone toolbar and confirming the resulting text and editor focus.
