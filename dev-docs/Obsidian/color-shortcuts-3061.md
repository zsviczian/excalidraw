# Popout color shortcuts — plugin #3061

The reported `S`, `S` sequence recolors selected text in the main Obsidian
window but fails in a popout. The first key opens the palette; the second does
not reach its inner keyboard handler. This checkpoint follows the
[cross-document ownership work](https://github.com/excalidraw/excalidraw/pull/11997).

The native negative control reproduces the exact difference on fresh artifacts:
main passes, popout fails to apply the palette color. Its focus trace shows the
outer Radix dialog focused, rather than the nested `.color-picker-content`.
Cleanup and baseline restoration pass. The actual production-artifact browser
negative control independently fails the same nested-focus assertion.

Radix FocusScope consults the runtime-global document during autofocus. Its
default can therefore replace an already-focused child in another document.
`PropertiesPopover.onOpenAutoFocus` now cancels that default only when the
mounted content already contains its owning document's active element. This
preserves the caller's focus, the existing touch policy and the default path
when nothing inside is focused. No listeners, timers, host protocol or API are
added. Other remaining global reads are not changed by this focused correction.

The plugin's existing native main/popout toolbar cases also verify actual
keyboard palette selection. Other contexts retain their earlier toolbar
obligations; the new full-desktop reproduction is explicitly scoped to the two
reported window contexts. The tools-panel width fix remains bundled on the
plugin branch. The fork's actual-artifact browser case covers palette keys,
Tab/Shift+Tab, Escape, Undo/Redo and isolation from the surviving main editor.

Fixture corrections are retained in ignored logs: the first native setup was
still in tray mode; the first browser setup lacked the explicit host UI-mode
adapter; Undo was initially sent after the palette disappeared but before
Radix's asynchronous editor-focus restoration. The final test waits for that
observable focus boundary. No product assertion was removed to accept a fail.

Branches: plugin `fix/tools-panel-drag-bar-width`, component
`fix/popout-color-shortcuts-3061`; parents `4f0e2fb7` and `6a731945b`.
The upstream inventory comparison remains `2c3dcc06e`. The maintainer's prior
component 0.18.149 release is accounted in provenance; this task changes no
version, dependency or lockfile and introduces no new package API.

Final validation: all 1,163 portable canonical cases pass, including 36 actual
production/development browser cases, coverage, owned types and package consumers.
Full types also pass. Focused native main/popout cases now pass the exact S/S
reproduction, tools-panel edge alignment/collapse and existing toolbar workflows.
Strict errors, cleanup and baseline restoration pass; original window bounds
are restored. Source and runtime artifact hashes match; see
[color-shortcuts-3061-results.json](color-shortcuts-3061-results.json).
The original native and browser failures remain recorded. The two PropertiesPopover JSX/comment lint
warnings reproduce exactly on its untouched parent; no new lint errors or
warnings are introduced. No physical mobile, other native desktop OS or
whole-application restart result is claimed. The maintainer confirmed #3061 fixed on 2026-11-21 and authorized commit/push
and a targeted upstream PR following #11997. Upstream submission uses a separate
clean branch without fork-only changes.
