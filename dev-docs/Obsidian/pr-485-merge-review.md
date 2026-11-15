# PR #485: caret zoom, text placement and editor resizing

Fork parent: `5a91f0c00f23d874aa73adef7fb964c0be6da1f7`.
Incoming upstream: `9e9621b873c695e08d87ad7e1358306496d11aaf`.
Merge base: `82d5847e57dcb6fb5982833ea9ec2137fe0b2bd5`.
Plugin: `1a8ee3e46dce14546310e16b82884a1077486351`.

The maintainer's third commit was fetched before acceptance. The earlier local
merge was backed up, aborted and rebuilt against the new head. All three commits
and twenty incoming paths were reviewed, including clean auto-merges. Only
actionCanvas and textWysiwyg required conflict resolution.

| Incoming paths | Resolution and preserved Obsidian contract |
| --- | --- |
| `common/src/constants.ts`, `common/src/keys.ts` | Adopt zoomed-out text width cap and layout-aware W mapping; preserve host constants and keys. |
| `element/src/selection.ts` | Adopt current-scene text lookup. One fingerprinted default map preserves the exported two-argument call. OBS-007/029. |
| `element/tests/__snapshots__/linearElementEditor.test.tsx.snap` | Incoming transform snapshot, with no fork-specific expectation. |
| `actions/actionCanvas.tsx` | Adopt optional caret anchors and center fallback. Preserve live host zoom step/min/max, clear/theme state and public fit semantics. Two step lines are fingerprinted. OBS-008/028/032. |
| `actions/actionTextAutoResize.ts`, `actions/actionToggleZenMode.tsx`, `actions/shortcuts.ts` | Adopt Alt+W, selected-free-text toggling, alignment-preserving wrapping and layout-aware Alt+Z. Existing plain-W wrap explicitly excludes Alt. |
| `components/App.text.ts` | Adopt edited-text side handles and zoomed-out width. Preserve raw Markdown/link submission, unchanged-source redo restoration and zoom-aware font creation. Full-only panel reservation is intentional: tray has no docked full panel. OBS-009/026/028. |
| `components/App.selectionTool.ts`, `components/App.tsx` | Adopt edited-text handle/hover ownership; preserve unlocked overlap, host pointer hooks, mobile guards and window lifecycle. OBS-021/029. |
| `components/HelpDialog.tsx`, `components/HintViewer.tsx`, `locales/en.json` | Adopt hints and English strings. No plugin setting, command or locale contract changes. |
| `components/canvases/InteractiveCanvas.tsx`, `renderer/interactiveScene.ts` | Adopt current geometry, side highlights and memo input. Preserve host highlight/search/frame colors, document ownership and view-mode double-click dispatch. OBS-015/021/029. |
| `tests/__snapshots__/contextmenu.test.tsx.snap` | Incoming Alt+W snapshot; generated diagnostic snapshots are not accepted. |
| `types.ts` | Adopt additive internal AppClassProperties.text. Preserve host props, state and public imperative declarations. OBS-007. |
| `wysiwyg/textWysiwyg.tsx`, `wysiwyg/textWysiwyg.test.tsx` | Adopt anchored transforms, exact wrapping width, caret zoom, overflow height and resize/Alt+W paths. Preserve host suggester, independent-theme caret, popup cleanup, tray/mobile panels and raw/parsed/link regression. OBS-009/010/021/024/026/028/033. |

## Partial decustomization

Retire the two unconditional local Math.ceil(width) overrides in editor placement
and bound paste. Upstream rounds a growing editor with a width-independent
transform anchor, while deliberately retaining exact fractional wrapping widths.
Unconditional local rounding would defeat that distinction. No saved field,
protocol, font or text-content migration is involved. OBS-009/026 remain active.

Production/development browser checks exercise center/right multiline text at
DPR 0.8/1/1.25 in full/tray/compact, fractional fixed-width text/bound paste,
custom-step caret zoom, Alt+W without remount and dragging without losing text.
Glyph tests decode PNGs and compare silhouettes at thresholds 64/128/200, with
unobscured-editor and minimum-ink checks. Chromium changed two faint antialias
fringes at fractional DPR while all masks stayed identical; PNG byte equality
incorrectly rejected unchanged glyph geometry. A pixel displacement changes the
masks and remains a failure.

The exported getActiveTextElement keeps two arguments and accepts the upstream
scene map. Source coverage tests a non-null legacy editing element and a newer
mapped element; the packed consumer compiles the legacy declaration. No plugin
caller was found, which does not justify breaking the exposed declaration.

Live zoom policy, raw Markdown, vault-link suggestions, canvas-theme caret and
tray/mobile panel ownership have no upstream host equivalent and remain intact.

## Validation and outstanding work

- Eight focused source cases and full/owned TypeScript pass. Exact fork-parent
  action diagnostics fail the three caret-anchor cases and pass four retained
  center/live-policy cases. The helper without its default fails the legacy-call
  test. Original source was restored after both red diagnostics.
- All 26 production/development browser cases pass, including the destructive
  unmount probe. Before the fix, that probe retained capture listeners traced to
  the incoming resize handler. Maintainer-approved cleanup uses the existing
  editor:unmount event and disposes that subscription on normal pointer
  completion: two fingerprinted lines. All capture listeners return to baseline.
- Raw inherited test:update fails before text operations at its undefined-scene
  bootstrap. Exact fork parent reproduces it in all 145 parent text cases.
  Generated/inline snapshots are restored; incoming snapshots remain intact.
  Latest-head diagnostic: 1,339 pass, 1,527 fail and 47 skip; all 159 failed text
  assertions stop at the inherited bootstrap, with one text assertion passing.
  Sixteen generated snapshot/inline-snapshot files were restored byte-for-byte.
- The YouTube test asserts restoration of all four original embed coordinates.
  Its former comparison incorrectly assumed the physical fullscreen display was
  wider than the restored page (800x600 fullscreen versus 1200x900 page). Entry,
  viewport and trusted-input assertions remain; no production YouTube changes.
- An accidental broad formatter was stopped. Primary tracked source had no
  unrelated changes. Twenty-three formatter-only historical-checkout files were
  backed up/restored; unrelated dirty work was preserved. Some ignored historical
  report formatting changed; recorded data was not intentionally altered.

## Completed acceptance

Runtime checkpoint: `85577c09270d948a052dc8a8f761fb34694945ee` (merge parents
5a91f0c and 9e9621b), with plugin 1a8ee3e4, Extras 4bd7af33 and clean isolated
K-Plex 69eb4642. The primary K-Plex checkout's unrelated work was preserved.
[The result summary](pr-485-results.json) records exact identities and hashes.

- All **1,041 portable cases** pass: 797 plugin fast, 169 fork owned, 26 built
  fork browser, 30 Extras source and 19 Extras browser. Coverage gates, full and
  owned types, normal ESM/Obsidian builds, plugin/library builds and both packed
  consumers pass. The exported helper's two-argument declaration compiles.
- All **468 required native cases** pass: 308 core and 160 device cases across
  all 40 declared profiles. Error/idle/source-stability gates, the actual
  unhandled-error negative control, cleanup and baseline restoration pass.
  Windows Obsidian 1.15.1, installer 1.14.5, Electron 43.8.3.
- Six additional native cases pass in main/popout and full/tray/compact modes:
  trusted caret zoom/reset with a live 7% step, Alt+W preserving editor/text/
  selection, side dragging without leaving editing, and physical save/reopen
  preserving raw text, custom metadata and wrapping mode. Initial probe failures
  were fixture/driver errors: selection needed the actual converted ID; the
  fitted camera started at 200%; an off-screen caret intentionally anchors to
  the canvas edge; the task framework requires explicit assertion labels. The
  corrected probe requires a visible caret and retains every behavior assertion.
  Production code was not changed for these probe corrections.
- The actual React-root unmount check also passes with a nonempty snap guide in
  both frozen browser artifacts, without console/page errors or retained capture
  listeners. This checks the existing stop() state-reset path during teardown.
- Native and portable frozen builds have identical hashes for all ten runtime
  artifacts compared: four fork files and three each for plugin and Extras.
  Production main.js is 5,149,322 bytes, leaving 93,558 bytes below 5 MiB.

The original combined command hit its outer 30-minute limit during device work.
Its native child retained the shared lock and completed all cases; no native job
was cancelled or replayed. The complete portable lane ran separately. The same
auditRegression function then accepted both actual report sets, all required IDs
and quality gates: **1,509 canonical cases**, cleanup passed. The original failed
coordinator report remains intact. This is a recovered orchestration timeout,
not a passing exit status for that original command. Native transport records
78 completed-operation receipt recoveries and six bounded read-only eval
retries; no mutation was replayed.

Focused test-file lint is clean. Read-only production lint has one error and
eleven warnings at existing import lines; the exact fork parent has the same
findings plus one additional formatting warning. No new lint finding is hidden
or fixed through unrelated source cleanup. Inventory comparison passes for all
279 differing paths; all fifteen checker tests pass.

The marker-owned repository-local vault was the sole native target, under the
shared application-user-data lock. No competing agent's session was taken over.
The declared baseline and original automation-window bounds were restored.

After this merge, the same two-line cleanup and three upstream controller cases
were submitted without fork fingerprints as
[upstream PR #12637](https://github.com/excalidraw/excalidraw/pull/12637), from
pristine upstream 9e9621b plus commit 1420f44e4. The proposed fix is linked in
[David's originating PR #12634](https://github.com/excalidraw/excalidraw/pull/12634#issuecomment-6895550390).
Retire the local cleanup fingerprints when an upstream merge supplies the same
behavior, keeping the teardown regressions.

Package version stays 0.18.147; no publication/dependency/protocol bump. Local
artifacts prove temporary integration only. Physical Android/iOS keyboards,
other native desktop systems, isolated restart and physical Electron application
zoom remain separate environments; fractional browser DPR is not device proof.

Priority manual tests: center/right multiline text at fractional application
zoom; caret zoom in main/popout; Alt+W and side dragging on rotated, wrapped and
Markdown-linked text in full/tray/mobile; undo/reopen; migrate while dragging
without releasing the pointer.
