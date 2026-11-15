# PR #486: selection framing, retained containers and history ordering

Fork parent: `f4f810960d5721e811181a8278ab97f01f64b668`.
Incoming upstream: `82190fb28f58070b34b4017e70c0e2e83701a8e3`.
Merge base: `9e9621b873c695e08d87ad7e1358306496d11aaf`.
Plugin validation checkpoint: `1a8ee3e46dce14546310e16b82884a1077486351`.

All eight incoming paths were reviewed against both parents, including clean
auto-merges. Only App.wrap.ts required conflict resolution.

| Incoming paths | Resolution and preserved host behavior |
| --- | --- |
| `element/src/delta.ts`, `element/tests/delta.test.tsx` | Adopt upstream unchanged: retain restored fractional indices, resolving collisions by live/changed/deleted priority without mutating unchanged caller objects. Protect three-step undo/redo order and host metadata. |
| `actions/actionFrame.ts` | Adopt upstream unchanged: discover deselected interior/near-edge content, whole groups including locked members, and insert the frame below unrelated overlaps. Marker exclusion remains in element/frame.ts; ordinary-frame factory calls do not affect marker naming. |
| `actions/actionBoundText.tsx` | Adopt upstream height/sticky-label restoration in unbindTextFromContainer and its App argument. Keep existing fingerprinted bind/wrap link ownership. Both internal callers migrate; no root runtime export, plugin caller or documented scripting contract for this helper was found. No speculative legacy adapter added. |
| `components/App.wrap.ts` | Adopt upstream last-selection tracking and retained-container behavior. Port only explicit-link transfer at actual deletion/restoration and merging on rebind. Raw Markdown, custom data and arrow rebinding use upstream transactions. Existing labeled shapes/arrows survive W unbinding. |
| `tests/wrap.test.tsx`, `tests/history.test.tsx`, `tests/__snapshots__/history.test.tsx.snap` | Accept incoming tests and snapshots unchanged; diagnostic snapshot updates are restored. Extend separate fork-owned tests and built-browser input coverage. |

The upstream implementation deliberately removes only containers created by W
while its resulting selection remains unchanged. Keeping the old unconditional
deletion/arrow-transfer logic would defeat this feature. Its obsolete locations
are removed with upstream's restructuring; no duplicate historical implementation
is retained. The fork link requirement remains active (OBS-010): retained
containers own their links, removed containers transfer ownership to text, and
rewrapping merges any newly added text link into its container exactly once.
All remaining upstream-file differences carry zsviczian fingerprints.

No further decustomization is justified: upstream has no host link, raw Markdown
or marker-role equivalent. actionFrame and delta retain no new fork differences.
W availability still uses isFullPanelMode for full/tray, includes compact, and
excludes mobile. No saved field, public API, adapter protocol or version changes.
Upstream PR #12637's resize-unmount cleanup is not in this incoming commit;
the previously accepted local cleanup remains intact.

## Validation checkpoint

Eighteen focused source cases pass, including generated/existing arrows, sticky
label font/ink and image-edge framing. Temporarily substituting
unmodified incoming AppWrap fails both generated-container link transfer and a
link added to freed text before rebind. Restoring the exact fork-parent delta
fails the new three-undo/three-redo ordering reproduction. Production source was
restored byte-for-byte after each negative control. The pure-delta immutability
case also passes the parent, protecting behavior that must remain unchanged.

All 28 built production/development browser cases pass, including W, link
ownership, retained containers, frame discovery/layering and undo/redo in
full/tray/compact. Complete portable/native and focused main/popout acceptance
now pass as recorded below. The primary plugin's unrelated RankMessage edit
is preserved; a clean detached checkpoint supplies validation builds. Extras
4bd7af33 and isolated K-Plex 69eb4642 keep companion inputs stable.

Required raw test:update: 1,345 pass, 1,532 fail, 47 skip; all sixteen generated
snapshot/inline-snapshot paths were restored byte-for-byte. Incoming snapshots
remain exact upstream bytes. Exact-parent targeted diagnostics reproduce the
old harness failures: history 2 pass/68 fail, wrap 2 pass/18 fail. Incoming has
history 2 pass/69 fail, wrap 2 pass/22 fail, including newly added cases. These
drivers use absent window.h state/scene/tool hooks and cannot establish native
behavior; independent owned/browser/native checks supply acceptance instead.
All 29 incoming pure-delta cases pass (parent 28). Failed evidence is retained;
no upstream expectation was rewritten to hide those failures.

Priority manual cases: W on an existing labeled shape/arrow versus a W-created
box; explicit links and Markdown labels through unbind/rebind/undo/save/reopen;
W on a selection surrounding deselected content, groups and marker frames;
three consecutive undos/redos after layer changes. Exercise main/popout and
full/tray/compact separately. Physical mobile and other desktop hosts remain
separate environments. Package version remains 0.18.147; no publication or
plugin dependency update is part of this merge.

## Completed acceptance

Runtime checkpoint: `63642251fac8dcf9ce8fcb85e3596686509087ee`, with clean isolated plugin 1a8ee3e4,
Extras 4bd7af33 and K-Plex 69eb4642. [Exact results and hashes](pr-486-results.json).

- All **1052 portable cases** pass: 797 plugin fast, 178 fork owned,
  28 actual fork browser, 30 Extras source and 19 Extras browser. Full/owned
  types, source coverage, normal ESM/Obsidian and plugin/library builds, both
  packed consumers and focused lint pass.
- All **468 required native cases** pass: 308 core and 160 device
  cases across 40 profiles. Strict error/idle/source-stability gates, actual
  unhandled-error negative control, cleanup and baseline restoration pass.
- Six additional native W cases pass in main/popout and full/tray/compact:
  generated-container link transfer versus existing-container retention,
  including a save between W presses; raw Markdown/custom data, undo/redo,
  interior frame discovery, marker exclusion, stacking and physical save/reopen.
- Both complete coordinators finish successfully as independent commands; the
  standard auditRegression accepts their combined **1520 canonical cases**.
  All ten frozen runtime hashes match across the two builds.
- main.js is **5,149,666 bytes**, 93,214 bytes below 5 MiB.

The first focused native probe retained long skeleton-converter IDs across a
save. ExcalidrawData deliberately replaces long text/linked-element IDs with
eight-character IDs for Markdown block references; saved scene diagnostics
confirmed that existing normalization, with the drawing and links preserved.
The test's lookup retained the old ID. Fixtures now use normal interactive
eight-character IDs; all workflow assertions, including save-between-W, remain.
The three failed diagnostic reports are preserved under ignored pr486-native-wrap
directories. No product code was changed to resolve this test setup failure.

Native host: 1.15.1 (installer 1.14.5), Windows, Electron
43.8.3. The initially closed app was opened at its
already registered canonical test vault. The shared application-user-data lock
remained exclusive; no competing agent session was taken over. Baseline settings
and original automation-window bounds were restored. No personal vault deployment,
package publication, version bump or plugin source/dependency commit was made.
Physical Android/iOS, other native desktop systems and isolated whole-app restart
remain separate environments.
