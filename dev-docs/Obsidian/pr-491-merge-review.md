# PR #491: focus, synchronization, teardown and upstreamed frame selection

## Inputs and scope

- Fork parent: `fd6fb4fc77cc428c5c23fef022d484ae30a7e289`.
- Upstream parent: `2c3dcc06ec807e81ab9437eceb1a8f7a3c590743`.
- Merge base: `d732d4f3d50e6ac092ec6e86a4e04a40546a9395`.
- Plugin: clean master `73b631abff6acb18a52acea72aad13307c49907f`.
- Extras: clean master `2623016ab1bf0685911848748cf2d2f2d3e91d29`.
- K-Plex initially: clean maintainer main
  `e225456d658fb33ed1fde8a7338d30a3724b1fbe`, eleven commits ahead of origin.
  It independently advanced before the final native run, which froze clean
  `3df07efaf7d43f4cf5f97b9a8e069b5b106b18f2`. The final provenance check matches
  that tested identity. No K-Plex changes or publication were performed here.

[PR #491](https://github.com/zsviczian/excalidraw/pull/491) brings four commits:
upstream #12675 keeps editing across window blur and reconciles newer remote
text; #12688 destroys an open editor on unmount; #12070 synchronizes Crowdin
translations/coverage tooling; #12692 accepts the fork's frame/group performance
fix. All 70 incoming paths, including 57 locale files, are listed below.

The package remains **0.18.148**, already bumped by the maintainer before this
merge. No dependency, lockfile, public API, host protocol, publication or saved
scene migration is added. Local component artifacts are an unpublished test
handoff, not a durable plugin dependency update.

## Three-way review and retirement

The only conflicts are `AGENTS.md` and `packages/element/src/groups.ts`.
Preserve both the fork's rules and upstream's Crowdin guidance. The accepted
group-selection guard is identical to the fork implementation, so remove the
two fingerprint comments and use the complete incoming `groups.ts` bytes.
Retire its active ledger row under OBS-015, keeping the history and all marker
contracts. The four owned cases cover more than upstream's three cases:
bounded work, nested/editing groups, singletons, partial enclosure and markers.

The demonstration remains [2,998 shapes in six groups](https://excalidraw.com/#json=55_v6EnlVelu2cxFISdex,c3TSN-MZ5NdsqiQLA16CQw):
draw an ordinary frame around every element. The upstream guard preserves the
previously confirmed improvement without a fork implementation delta.

Clean auto-merges are reviewed too. Keep AppText's raw-source preparation,
submission/link/history helpers and zoom-aware creation. Keep its PR #485
resize-drag unmount subscription: upstream `destroy()` handles the textarea,
not an active resize drag. Preserve host suggestions, canvas caret theme,
popup closure and full/mobile/tray property-panel recognition in WYSIWYG.
Keep image cancellation, view migration ordering, owner-window handling,
marker behavior and shared-runtime/cache contracts. Upstream does not provide
equivalent replacements for those differences in this merge.

## Reproduced Markdown regression and targeted preservation

The clean incoming scene-following code sets the textarea to `originalText`.
After a window blur and external scene update, that changes an editable
`[[Fresh|Fresh label]]` into the parsed `Fresh label`. The actual mounted editor
reproduces this: four focused cases pass and that case fails before the fix
(`.test-work/pr491/text-focus-before.log`).

At the new upstream update point, obtain the editable value through the existing
`onBeforeTextEdit(latestElement, true)` callback, falling back to upstream
`originalText` when no host value is returned. This small fingerprinted block
preserves compatibility mode and raw Markdown without introducing a new host
capability or changing stored data. The callback can now run for an external
replacement during an existing session as well as at session creation; its
signature stays unchanged. The plugin callback reads current scene `rawText`,
resets its editing timer and retains its existing editing semaphore.

Local typing still stops scene-following until the next blur. Actual document
focus movement submits once. External deletion closes editing without reviving
the element; unmount removes the editor/listeners after `app.unmounted` is true
and does not submit into the destroyed scene. Remote reconciliation accepts a
newer edited text while retaining resizing/newer-local conflict guards.

## Reviewed inventory refresh

The parent comparison against the real merge base reports ten existing drift
items: eight stale rows plus two complete-tree hashes. These predate PR #491.
Reviewing `63642251f..fd6fb4fc7` accounts for them explicitly:

- App.text, InteractiveCanvas and interactiveScene adopt upstream #12672's
  edited-text resize/hover-affordance follow-ups.
- App.tsx also follows upstream's component Web Share removal and shape-popup
  keyboard behavior; no Obsidian loader is removed by this checkpoint.
- WYSIWYG and its upstream test add rotated-anchor wrapping coverage.
- English strings carry upstream's rotating app promo messages.
- package.json carries the maintainer's existing 0.18.148 version.

Refresh those reviewed rows, the incoming customized paths and the three
changed/added independent test-driver paths. New source/browser paths map to
OBS-009/019/033. Remove only the exact-upstream groups.ts row. The current
ledger has **285 paths**, and complete compared trees contain **1,381 fork /
1,342 upstream files**. Preserve all 39 stable OBS IDs, original archive
provenance and historical merge evidence. No unexplained drift is accepted.

## Release-size preservation

The first complete portable run builds successfully but fails the unchanged
5 MiB plugin gate: **5,259,152 bytes**, with the other 813 plugin source tests
passing. Crowdin's larger translations push the compressed payload over the
target. A UTF-8-printing probe reduces the raw artifact but does not help the
shipped plugin, whose second minifier already emits UTF-8; that option is
reverted rather than retained as an ineffective customization.

The production Obsidian builder instead omits empty translations and strings exactly
equal to their English fallback. Upstream `t()` already resolves both cases to
that same fallback. `compactTranslations.cjs` is a pure build helper; it keeps
nested objects/non-string values and never mutates locale source. English and
completion percentages are excluded from compaction. ESM output, original
development JSON source maps, all language
choices, runtime dependencies, inflater and offline assets stay unchanged.

Fifty-seven independent cases compare every source/fallback path for all
56 non-English locale files and protect source immutability. Both actual
artifacts display Japanese, Chinese, Russian and Arabic labels correctly,
alongside all existing browser cases. The rebuilt plugin is **5,218,572 bytes**,
saving **40,580 bytes** and leaving **24,308 bytes** below the same target.
The failed first portable report remains in
`.test-work/reports/regression-2c915bf7-7481-4015-a456-397c1625090b` in the plugin.

## Validation

Completed acceptance ([machine-readable record](pr-491-results.json)):

- Immediate and post-Markdown `build:obsidian`: passed.
- Full `yarn test:typecheck` and fork-owned `test:obsidian:types`: passed.
- Final focused Markdown/frame checkpoint: **12 passed**, including all eight
  focus/reconciliation cases and all four frame/group cases.
- Focused ESLint: zero errors; two pre-existing WYSIWYG import-order warnings.
  The installed stylish formatter cannot load its ESM dependency, so the JSON
  formatter retains the actual rule results without changing the rules.
- Compaction unit suite: **57 passed**, including every effective locale path.
- Actual production/development browser suite: **32 passed**, cleanup passed.
  The new case checks source preservation, trusted submission, external
  deletion and active-editor unmount. Headless Chromium focus emulation makes
  its blur events handler coverage; they do not establish real OS focus changes.
- Complete portable and native acceptance: **1,614 canonical cases passed**:
  1,142 portable, 312 native core (including final source stability), and 160
  device cases. Required identities are complete. The ordinary regression
  auditor accepts the reports and all three quality gates; exact frozen source
  identities and all producer artifact hashes match between portable/native
  builds. Cleanup and vault baseline restoration passed.
- Plugin production and development builds passed. The final production
  rebuild is byte-identical to the tested artifact: **5,218,572 bytes**.
- Inventory: **285 paths** and both complete-tree fingerprints match;
  **15 checker cases passed**. Only this acceptance documentation changes after
  the frozen run; implementation hashes are recorded with the results.

The initial focused/full native runs retained the split Markdown alias failure;
the full run also stopped text creation at its usable-geometry prerequisite.
Evidence shows the test window was 629 x 800 with a 283-pixel drawing root and
the tray open. Under the shared host lock, validate the marker-owned vault and
window, verify no pending tasks/popouts/debugger, and widen only that window to
1200 x 1000. The focused matrix/text-history rerun and full standard native
profile then pass without changing production code or test assertions. Restore
the original bounds (x=250, y=305, 629 x 800) after cleanup; the restoration probe
confirms no pending tasks, popouts or debugger attachment. Other vaults remain
untouched. All earlier failed/interrupted reports remain historical evidence,
not accepted passes; their identities are recorded in the results.

The browser fixture explicitly preserves generated IDs/source fields, waits for
its own current API/closed editor, activates Selection only when necessary and
hit-tests the canvas before trusted input. Earlier fixture/context/focus-
emulation failures are retained separately; none is accepted as a product pass.

## Risk-based manual checks

Most likely regression: changing windows while a parsed Markdown label is being
edited, followed by an external update or a view migration. Check raw and parsed
text, ordinary and bound labels, Alt-Tab away/back, a second drawing window,
external source replacement/deletion, submit/undo/redo and durable reopen.
Exercise main-window and popout teardown separately, including an active resize
drag. Check full/tray/compact panels and mobile keyboard/focus behavior.

Also draw ordinary and marker frames over large groups, and check offline
fonts/labels in a translated locale. Native Windows evidence, other desktop
OSes, physical Android/iOS and an isolated whole-app restart are distinct gates;
unavailable environments must remain explicit in the final acceptance record.

## Incoming file accounting

| Incoming path | Resolution |
| --- | --- |
| `.github/workflows/locales-coverage.yml` | Adopt upstream verbatim. |
| `AGENTS.md` | Resolve by retaining fork policy and upstream Crowdin guidance. |
| `excalidraw-app/App.tsx` | Adopt upstream verbatim. |
| `packages/element/src/groups.ts` | Retire fingerprint; entire file exactly upstream (OBS-015). |
| `packages/element/tests/groups.test.ts` | Adopt upstream verbatim. |
| `packages/excalidraw/components/App.text.ts` | Adopt destroy/deletion guard; retain Markdown, sizing and resize-unmount hooks. |
| `packages/excalidraw/components/App.tsx` | Adopt text.destroy; preserve existing host/root/image/window contracts. |
| `packages/excalidraw/data/reconcile.ts` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ar-SA.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/az-AZ.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/bg-BG.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/bn-BD.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/bn-IN.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ca-ES.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/cs-CZ.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/da-DK.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/de-CH.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/de-DE.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/el-GR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/es-ES.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/eu-ES.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/fa-IR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/fi-FI.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/fr-FR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/gl-ES.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/he-IL.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/hi-IN.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/hu-HU.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/id-ID.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/it-IT.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ja-JP.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/kaa.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/kab-KAB.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/kk-KZ.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/km-KH.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ko-KR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ku-TR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/lt-LT.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/lv-LV.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/mr-IN.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/my-MM.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/nb-NO.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/nl-NL.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/nn-NO.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/oc-FR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/pa-IN.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/percentages.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/pl-PL.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/pt-BR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/pt-PT.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ro-RO.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ru-RU.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/si-LK.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/sk-SK.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/sl-SI.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/sv-SE.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/ta-IN.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/th-TH.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/tr-TR.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/uk-UA.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/uz-UZ.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/vi-VN.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/zh-CN.json` | Adopt translations; retain only host localFont label. |
| `packages/excalidraw/locales/zh-HK.json` | Adopt upstream verbatim. |
| `packages/excalidraw/locales/zh-TW.json` | Adopt upstream verbatim. |
| `packages/excalidraw/tests/data/reconcile.test.ts` | Adopt upstream verbatim. |
| `packages/excalidraw/tests/stickyNotes.test.tsx` | Adopt upstream verbatim. |
| `packages/excalidraw/wysiwyg/textWysiwyg.outside.test.tsx` | Adopt upstream verbatim. |
| `packages/excalidraw/wysiwyg/textWysiwyg.tsx` | Adopt focus/sync/cleanup; preserve source via existing callback and all prior host hooks. |
| `scripts/locales-coverage-description.js` | Adopt upstream verbatim. |
