# Independent Obsidian fork regression

Current fork behavior is the accepted baseline. Protect the intended Obsidian
contracts and the upstream editing workflows affected by fork changes. Upstream
merges have their own upstream testing; this suite does not duplicate the full
web-app suite or adapt its helpers to define fork correctness.

Use Yarn and Node 22.22.3:

```sh
yarn test:obsidian:coverage
yarn test:obsidian:types
yarn --cwd packages/excalidraw build:esm
yarn --cwd packages/excalidraw build:obsidian
yarn test:obsidian:package
yarn playwright install chromium
yarn test:obsidian:browser
```

Linux CI needs `yarn playwright install --with-deps chromium`. Reports, coverage,
logs and captured images stay in ignored `.test-work`; set
`EXCALIDRAW_TEST_REPORT_DIR` for a fresh run. The plugin coordinator's
`npm run test:regression` runs these independent checks, Extras, plugin
fixture/source tests and native CLI/EA authoring. Use its portable variant
without a native session. Native transport and application ownership remain the
plugin coordinator's responsibility.

Owned discovery uses fork-only ledger entries and `tests/obsidian`. Source tests
mount actual components or import whole production modules. They use controlled
fixtures and boundary fakes; JSDOM canvas mocks do not prove rendered pixels.
Tool activation waits for its real owning-window task, without forcing the API
synchronous or transforming upstream test helpers. Missing/zero cases, duplicate
IDs, unexpected skips, changed source, failed cleanup and coverage ratchets fail.

The fixture-backed core cases protect raw/display text, explicit links, arrow
bindings and extensible metadata across restoration. They also check scheduled
activation of current tools, toolbar targeting, host-forced tools, library
updates, UI-disabled pointer input and host pointer-down hooks before panning.
Existing independent cases cover both host registries, frame-role actions,
locked overlap selection/cycling, wrap/history/link ownership, host text metrics,
Mermaid/Pele, fonts, custom export adapters, device preferences and owner-document
portals. Coverage reports list unexecuted runtime modules and type-only files;
loading a module does not establish behavioral coverage of its entire OBS group.

The actual production/development browser artifacts must mount, draw all six
basic tools with trusted input, preserve selection/group/delete/undo/redo,
operate library search and portal menus, decode expected PNG/SVG pixels, load
Unicode fonts offline, and keep a second document/editor independent. Every
browser error or external request fails. Private React is supplied exactly as by
the plugin consumer; production test hooks/globals must be absent.

The package lane packs generated artifacts and declarations, installs the actual
tarball in an isolated consumer, accepts supported calls and rejects invalid
ones. It never publishes. The corrected export map points at generated
`types`, rather than nonexistent `dist/types`. Package versions and runtime
protocols are unchanged by this testing PR. Publication and the exact plugin
pin update remain maintainer-coordinated work.

## Historical upstream diagnostic review

The follow-up for plugin #3022 adds immutable pairwise saved-image variants in
`fixtures/image-variants.json` and `unit/imageVariants.test.ts`. These guard shared
file identity, distinct dimensions/crops, zero opacity, locked state, frames,
links and unknown host metadata through JSON restore. They establish saved-data
behavior; the plugin's repository-local native vault establishes actual decoded
raster/SVG/PDF rendering and source-edit/missing-file recovery. No upstream-owned
test or runtime file changes are needed for this extension.

`yarn test:obsidian:compatibility` is an optional investigation, not a required
PR gate. Its separate configuration retains the old helper adapters solely to
inspect historical failures. The independent regression configuration does not
load them. The upstream Vitest configuration remains unchanged. Legacy web-app
test/coverage CI jobs run only in the upstream repository; fork PRs use the
independent Obsidian gate and its optional manual compatibility audit.

[Individual assessment of all 380 failed assertions](../../dev-docs/Obsidian/test-deviations-3022.json)
records the old failure, exact source assertion and disposition. It is not an
expected-failure list and is not consumed by the passing suite. The review
separates incidental render counts/snapshots, old timing/selectors, deliberate
selection/pointer/link contracts and diagnostic-host service mismatches. A
failure before an operation does not prove that operation is broken. Do not
update snapshots automatically or silently change product behavior to match an
old driver. Report an independently reproduced suspected error to the maintainer
for a bug-versus-intended-behavior decision.

The manual workflow can opt into that diagnostic. The plugin's private-React
scheduler correction passes all 44 production native cases plus 40 device/layout
cases without unexpected errors. The development-mode dirty-migration residual
and unavailable isolated restart are tracked in its `docs/TESTING_FINDINGS_3022.md`.
Physical Android/iOS, other desktop hosts and real restart remain separate
environments. Browser shortcuts select Meta on macOS and Control elsewhere;
native macOS validation is still separate evidence.

Update the OBS ledger/catalog after each changed fork boundary. Preserve exact
source/artifact identities, covered semantic contracts and coverage floors.

## 2026-10-29 approved font correction

The maintainer approved fixing the empty-source Helvetica fetch found by native
Markdown-image coverage. `getCSSFontDefinition` now returns an empty definition
for registry entries marked local, matching CSS font registration. The independent
source suite passes 126 cases, including local-font no-fetch and bundled-font CSS
regressions. Native checks use the current workspace fork and Helvetica frontmatter;
the expanded coordinated acceptance remains in progress. No upstream tests changed.
