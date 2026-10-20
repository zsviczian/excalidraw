# PR #471 merge review — Instagram embeds and export font sets

2026-10-20. [PR #471](https://github.com/zsviczian/excalidraw/pull/471)
merges incoming `bee01e3a12812c930109aa91242658709480bbf3` into fork parent
`22d40c4a8b605dd19469c6fba1be492c547f4ed2`. Merge base:
`d3a9c2a195182bf65b526ccb7a19de96f4bdfdb3`. Incoming commits are Instagram
support (`a3fdf471e`, upstream #12373) and worker export font loading
(`bee01e3a1`, upstream #12374).

## Complete incoming-path review

| Path | Review and resolution |
| --- | --- |
| `packages/element/src/embeddable.ts` | Clean merge. Adopt Instagram URL normalization, portrait bounds and domain entries unchanged. Preserve HTML-data support, Obsidian desktop/iOS YouTube routing, existing same-origin policy and placeholder rawText (OBS-009/010/016). |
| `packages/element/tests/embeddable.test.ts` | Exact incoming source; four Instagram variants join the existing provider tests. |
| `packages/excalidraw/components/App.clipboard.ts` | Clean merge. Adopt upstream exclusion of separate empty loader-script lines. Preserve third onPaste file argument/cancellation, lazy host Mermaid, raw Markdown and zoom-aware text sizing (OBS-009/011/026/030). The loader script is discarded from paste routing, not executed by the clipboard code. |
| `packages/excalidraw/fonts/Fonts.ts` | Only conflicted file, two hunks. Use upstream FontFaceSet registration/loading and worker fallback; keep Local Font exclusion and Helvetica loading guard, unrelated host-font event filtering, replaceable registration and public helpers (OBS-013). |
| `packages/excalidraw/tests/clipboard.test.tsx` | Clean merge. Keep incoming Instagram case and existing file-aware host/rawText tests. Older renderer harness failures are separately identified below. |
| `packages/excalidraw/tests/scene/export.test.ts` | Exact incoming source. New worker-font and no-font-set warning tests pass; the existing embedded-scene snapshot mismatch is reproduced on the parent. |

Both parent diffs were reviewed, including auto-merges. The font loader's
previously public `loadFontFaces(families, characters, Document)` form remains
accepted alongside the new FontFaceSet form. Structural normalization avoids
cross-realm instanceof checks. Internal callers pass the document's actual
font set. No host protocol, persistent font ID, saved field, public export
wrapper, plugin migration code or storage ownership changes.

The plugin's FontManager still owns replacing Local Font faces in each open
document. Upstream worker support does not replace this behavior or the host
embed routing/policy. No complete fork delta or OBS ID is retired. The ledger
adds one fork-only test and refreshes four existing rows against the exact
incoming snapshot. New `obsidianFonts.test.ts` checks explicit document
isolation, both public argument forms and host ownership of Local Font.

## Validation

- Node 22.22.3. Obsidian production/development artifacts and declarations build.
- Final focused lane: 41 tests in five suites pass (embeddables, font ownership,
  cross-document editors, host abstraction and legacy exports).
- Both new upstream export-font tests also pass independently (worker font set
  and one-time missing-font-set warning).
- Full `test:update --exclude 'tmp/**' --maxWorkers=2 --minWorkers=1`:
  77 passing / 79 failing suites; 1,168 passing / 1,457 failing tests,
  47 skipped / one todo, three reported unhandled errors. No full-suite pass
  is claimed. All 15 unrelated snapshot edits and the unrelated inline snapshot
  update were restored.
- Exact parent clipboard/export run: 30 passing / 31 failing tests. Candidate
  has two passing / 31 failing clipboard tests and 30 passing / one failing
  export test; the new Instagram clipboard test shares the old harness failure,
  while both new export-font cases pass. The same embedded-scene snapshot
  mismatch occurs on both parents. Runtime paste is checked independently.
- `test:typecheck` retains exactly the three #469 baseline diagnostics:
  `obsidianExcalidrawHost.test.ts` matcher, missing fixture rawText, and missing
  Mermaid tool-query mapping. No new font or merge-path diagnostic.
- Touched runtime source and new test lint: zero errors; only the three existing
  unused-import/constant warnings in `element/src/embeddable.ts`.
- Plugin production build passes with the existing 16 circular dependency
  reports. Four bundle checks pass. No dependency/lockfile/version change;
  testing uses only the four copied local artifacts, not a published package.

macOS/Linux, physical mobile, offline third-party
provider behavior, cold/restored popouts and changing installed Local Font
files remain separate manual gates. Instagram rendering depends on provider
availability; URL/paste success does not establish availability or login state.

Highest-probability failures to check manually are custom-font replacement
while main/popout editors coexist, actual Instagram post/reel activation and
resizing in desktop webviews versus mobile iframes, and native macOS dirty
popout teardown. Exercise ordinary/file paste and host cancellation after
changing fonts. Existing migration ownership/unmount contracts remain required.

## Windows native integration and remaining baseline issue

The guarded `excalidraw-test` vault runs the exact candidate production bundle
on Windows Obsidian 1.14.4. Final feature run passes plugin reload/mount,
simultaneous main/popout roots sharing one runtime, synthetic Instagram
blockquote-plus-separate-script paste through actual editor handlers in both
documents, seeded SVG/PNG export, independent ordinary/hyperlink tooltips,
first-font readiness in a blank popout, image insertion, closing a popout while
the main editor remains usable, and removal of the closed window's
ExcalidrawLib alias. No React globals/editor test hooks are introduced.
JavaScript error collection is empty and owned fixtures/controllers are cleaned.
The fixture primes copied image files through addFiles/awaitImageFiles after
waiting for the popout API; this is not an assertion about automatic file-loader
timing. The first broader attempt timed out waiting for that automatic fixture
load, with successful cleanup.

An additional broader migration probe passes dirty main-to-popout but times out
on manual popout-to-main reparenting: both edits remain visible, while the
expected replacement view/unmounted source is not observed. **The exact parent
22d40c4a8 reproduces the same timeout and assertion values with the same probe.**
This is unresolved baseline/test-setup evidence, not a successful migration
check and not proof of a new #471 regression. Both attempts clean up. The later
pending-image migration and durable-reopen steps are consequently not reached
in this checkpoint. PR #469's previously successful native migration record
remains historical; it does not turn these attempts into passes. No production
migration code is changed to accommodate a test.

Parent/candidate main/popout seeded exports all match: 264 × 155 pixels,
PNG 9,788 bytes, pixel SHA-256
`122d1196c0e7f830f929b832ac295836379815a102c35d8ab29e78ce8b6078b1`,
SVG SHA-256 (font inlining disabled)
`15fcfff88e7d0801b600bd28efd8ffa5ccc842383dc4cb0b0d04735faaa159af`.
These fixtures do not cover arbitrary fonts or provider page content.

Final plugin main.js is **4,961,338 bytes**, leaving **281,542 bytes** under
5,242,880. SHA-256:
`def0828dcc1105fcc5c4c0703ef1ec7ba5d7c185a081726ae2ac4c229c19309c`.
The freshly rebuilt exact-parent bundle is 4,960,550 bytes (+788 for candidate).
The candidate artifacts/build are restored after the parent comparison; only
ignored installed/generated files change in the plugin, plus its local
RefactorPlan record. No plugin commit, publication or durable dependency handoff.

The final source audit passes **234 paths**: 161 modified, 34 fork-only,
39 upstream-only; complete trees 1,313/1,318. All 15 checker tests pass.
Local reports/logs are in the plugin's ignored `tmp/pr471-*` paths, including
`pr471-candidate-feature-final-popout/report.json`, parent/candidate broader
migration reports and the fork's focused/full/baseline test logs. Source test
failures, the baseline return-migration timeout and missing platform coverage
preclude a zero-regression certification.
