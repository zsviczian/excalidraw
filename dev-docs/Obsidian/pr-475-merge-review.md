# PR #475 merge review - Mermaid 3/Pele and host label metrics

Reviewed 2026-10-27. This is a source merge and unpublished three-repository
integration checkpoint, not a published-package or all-platform release claim.

## Exact inputs and scope

- Fork parent: `404912c08166f553ed22c97f246d274fbcd74e11` (master, initially clean).
- Incoming [PR #475](https://github.com/zsviczian/excalidraw/pull/475):
  `14bb42edee3d6fee6be264e3ee78670b3b9cee79`;
  tree `001e021f4db3e677481ad415f43abead1b533bf5`.
- Merge base: `b7de45e88111f5680ae4bb3c3f3541c7d3b279fe`.
- Plugin parent: `5156e39aceac2ba769f811b15d65a016696719ca` (master, initially clean).
- Extras parent: `71249336740e12fe6c67b57fc53b45f18db1e24e`
  (master, initially clean).

All 72 incoming paths are accounted for below. The six incoming commits
cover Mermaid 3/Pele, skeleton arrow binding, one-corner elbow routing,
CPU-backed PNG export and web-app statistics tooling. Existing fork parent
already includes #473/#474; neither is replayed as a new customization.

## Conflict resolution and preserved contracts

Three conflicts were compared against base/fork/incoming:

1. `TTDDialog/common.ts`: retain `customData.mermaidText` while adopting
   upstream `renderEnvironment`. Converter v3 skeletons are readonly: map image
   skeletons to copies instead of mutating them. The queued/public conversion
   helper uses the same immutable replacement. Ordinary native skeletons pass
   through unchanged, and converted IDs retain their normal behavior.
2. `packages/excalidraw/package.json`: update the existing dev-only converter
   to exact `3.0.0`; do not restore upstream runtime math/Mermaid dependencies
   or change fork identity, exports, package version or Obsidian build scripts.
3. `yarn.lock`: use the fork lock as the base, then resolve merged manifests
   with Yarn. Preserve the fork's security resolutions rather than accepting
   upstream's older dependency graph wholesale. Old Mermaid dependencies are
   pruned; Pele 1.8.0 and incoming Playwright 1.58.2 are resolved.

One fork-only caller also needs a mechanical adaptation: `refreshAllArrows`
passes `moveMidPointsWithElement` in the new fifth transient-options argument,
not the fourth element-updates argument. Keep its self-binding predicate.
The first declaration build caught that mismatch; it also caught readonly
image mutations. Both were fixed before the successful paired builds.

Protocol 2, `ObsidianMermaidService`, public `loadMermaid()` and the plugin's
`getMermaid()` retain **{loaded, api}**. Dialog status remains private UI state.
The real plugin producer/adapter/ambient bridge are typechecked both against
installed published declarations and the newly generated local fork
**declarations**, including converter 3. The local native verification command
now checks this second lane before copying the four runtime artifacts. This
closes the runtime-only handoff gap that previously concealed #472's type drift.

No host registration, view migration, storage ownership, React ownership,
serialized scene field or public script API is changed. All clean auto-merges
were reviewed for preserved Markdown rawText/link handling, custom styles,
legacyTextWrap, anchored images, marker export filtering and owning-document
rendering. Upstream binding/history/actions now forward host text metrics.

## Decustomization decision

No additional customization is safely retired in this checkpoint. Actual old
Extras 2.2.2 and candidate Extras 3.0.0 both render pie, mindmap, gantt, journey,
timeline, git and quadrant as image skeletons. Existing saved images also carry
the same editable-source field. Deleting source attachment or selected-image
seeding would lose editing. Pending-preview refresh, always-visible preview,
queued conversion and loaded/api public aliases still have distinct consumers;
the incoming change does not replace them. D13 remains open. The narrow image
mapping is fingerprinted beside the replaced upstream argument; all new helper
and regression code is covered by the existing ringfenced ownership.

## Companion changes and release boundary

Extras pins converter `3.0.0`, advertises Mermaid component `3.0.0`, and removes
the now-inert `mermaid` override because the converter no longer depends on
that package. Its raw-module lazy API remains unchanged. Its API declarations
build successfully. The plugin's existing exact-version handshake now requires
`3.0.0`, and upcoming release notes explain the Extras update. Tests reject both
old 2.2.2 and unexpected 3.0.1, accepting only the supported engine.

Pele is bundled **only in Extras**, not the Excalidraw/React payload or a network
loader. No Obsidian 1.15 API, embedded Obsidian Pele, new external origin or
runtime remote-code loading is introduced. Package/manifest release versions
and the plugin's exact `0.18.144` fork dependency remain unchanged. Companion
source changes are local; no companion commit or publication is performed.

The four local fork artifacts are copied only into ignored installed package
paths for integration, with no edited declarations or `file:` dependency. A
release still requires publishing the next fork and Extras versions, updating
and installing the plugin's exact fork dependency/lockfile, then repeating the
checks against those published bytes before the plugin release. A normal
`npm install` restores the currently published fork artifacts.

## Source validation

- Obsidian artifact and generated declarations: pass. React/JSX stay external,
  no bundled Mermaid/Pele or runtime chunks; required offline fonts retained.
- Focused six-suite run: **73 tests pass**, covering Pele error/autofix handling,
  frozen image skeleton/source metadata, loader retry/cache/contract behavior,
  mounted host label metrics/rawText/alignment/refresh, shape and public exports.
- Incoming CPU-backed canvas test: **1 passes**, 31 unrelated tests skipped.
- Plugin: **19 tests pass**, including four production bundle checks, installed
  type contracts, three exact-version checks and eleven CLI runner/tool tests.
  The additional generated-local-declaration lane also passes.
- Extras: **4 tests pass** against the actual module, checking advertised
  version, headless SVG fallback labels, syntax errors and maxTextSize. Native
  element conversion is separately exercised in real Obsidian, not inferred
  from the deliberate DOMParser-less Node fallback.
- Plugin production and public library builds pass without TypeScript
  diagnostics. Development emits successfully with the same five TS7006
  baseline CLI/view warnings and existing sourcemap warning. Extras production
  and API declaration builds pass. Focused source lint passes with zero findings.
- Full fork `test:typecheck` still fails on exactly three documented baseline
  test diagnostics: `obsidianExcalidrawHost.test.ts:132` matcher,
  `fixtures/elementFixture.ts:59` rawText and `queries/toolQueries.ts:8` tool map.
  No changed source/test file adds a diagnostic.
- Required `test:update`: **81 suites pass / 80 fail; 1,242 tests pass /
  1,476 fail / 47 skip / 1 todo; three unhandled errors**. Legacy window.h
  mounting/capture failures remain, including the six new upstream metric
  tests. All generated snapshot/inline changes were restored **from the merge
  index**, preserving incoming upstream snapshots. No broad green suite claimed.
- The eight transform snapshot mismatches reproduce on exact fork parent
  `404912c0` in the isolated baseline worktree (21 other parent tests pass).
  The merged run passes 40 tests and has the same eight mismatches. They include
  rawText and fork-generated IDs; nondeterministic IDs were not blessed.
- An initial export-test import exceeded the default five-second timeout;
  the final focused run at 20 seconds passes all ten public export tests.
  An initial production-bundle check was mistakenly run on development output;
  after restoring production, all four bundle checks pass. No assertion was
  weakened. ESLint uses JSON formatting to avoid its Windows stylish loader issue.

- Inventory: **15 checker tests pass**; exact incoming comparison passes all
  **237** differing paths and both complete-tree fingerprints (1,325 fork /
  1,327 upstream). Twenty-four existing rows and one new test row were reviewed;
  no whole-file customization was retired.

## Native Obsidian evidence

Windows, Obsidian **1.14.5 (installer 1.14.0)**, dedicated
`C:/Obsidian/excalidraw-test`, real installed Extras, exact built artifacts.
Only guarded disposable fixtures and this vault's installed three-file payloads
were changed. Existing Extras settings are preserved; old artifacts are backed
up in the plugin's ignored `tmp/pr475-extras-baseline`.

The following reports pass scenario, captured-JavaScript-error and cleanup gates:

- `P: tmp/pr475-native-core/report.json`: plugin reload/mount, live wheel limits,
  text undo/raw Markdown, grouped links, native authoring/relationships/history,
  decoded images, preview geometry, SVG/PNG export, persistence/reopen and large
  identity-race checks. Wheel probes include main and popout.
- `P: tmp/pr475-native-popout/report.json`: repeat native CLI authoring with
  `EXCALIDRAW_CLI_POPOUT=1`, including the image-preview/export matrix in main
  and popout. Teardown and fixture cleanup pass.
- `P: tmp/pr475-mermaid-native/report.json`: **41 assertions**, main renderer
  forced offline via CDP; declined service/rejected API then real Extras load,
  exact-version acceptance/rejection, actual parsing of all twelve baseline
  diagram kinds, finite converted geometry and native/image representation,
  invalid-source rejection, EA insertion, editable image metadata, main/popout
  selected-source previews and PNG export, public loaded/api shape and
  byte-preserving save/reopen. Host observer records two lookups and sixteen
  parser calls. It restores the wrapper/network and removes owned fixtures.

The old engine's twelve-kind capture is local at
`P: tmp/pr475-parent-mermaid.json`; candidate semantic results are in
`P: tmp/pr475-feature-result.json`. Layout/counts can change with the engine;
representation and finite conversion are checked, not pixel-identical layout.
The image-source preview test uses a newly generated image with the same saved
metadata contract, not a claimed historical-vault fixture. Native probes use
public APIs and synthetic events; they do not prove physical touch input.

A first broad native attempt stopped at the unrelated SVG-import corpus gate:
this test vault has no `TestAssets` directory. That scenario is **not passed**;
all relevant authoring/image/export cases above were rerun separately. An early
Mermaid probe refused an already attached test debugger; the successful retry
reuses it and restores network state without detaching an unowned connection.

Production `main.js`: **5,012,218 bytes**, **230,662 bytes** below 5 MiB;
SHA-256 `343b6b7f28afac462d97731cca90e30e0ed04ab6dc7d24af36778b3941aff07d`.
Both native lanes and the final production rebuild use matching bytes. Fork artifact hashes are retained in the native report; Extras/plugin
artifact hashes are recorded in `P: tmp/pr475-paired-artifacts.json`.

## Remaining risk-based manual checks

Highest-probability engine risk: existing complex Mermaid syntax/configuration
or label layout changes. Open representative saved diagrams (especially image
kinds), edit source, submit/cancel/retry invalid source, Undo/Redo, export and
save/reopen in main, direct/restored popouts and after plugin reload. Compare
arrow labels while aligning/resizing/rebinding and re-rendering Markdown.

Windows automated coverage passes. Physical mobile touch, macOS/Linux,
cold application restart/restored popouts, complex historical diagram corpora,
full scanner and the absent SVG TestAssets corpus remain unverified. Full
source/type suites remain red as recorded. These limits prevent an absolute
zero-regression or all-platform release-readiness claim; no bypass is added.

## Incoming path accounting

"Upstream" means no previous ledger customization on that path. Existing OBS
ownership survives unchanged except the explicit readonly-image/transient-option
adaptations above. Runtime, tests, packaging, CI and auto-merges are all included.

| Incoming path | Existing ownership | Review/disposition |
| --- | --- | --- |
| `.github/workflows/stats.yml` | Upstream | Adopt upstream web-app measurement/CI tooling verbatim; excluded from Obsidian runtime. |
| `excalidraw-app/index.tsx` | Upstream | Adopt upstream web-app measurement/CI tooling verbatim; excluded from Obsidian runtime. |
| `package.json` | OBS-002, OBS-034 | Adopt upstream stats scripts/Playwright; preserve fork scripts and security resolutions. |
| `packages/element/src/__tests__/__snapshots__/transform.test.ts.snap` | Upstream | Adopt only incoming snapshots; restore local test:update rewrites from index. |
| `packages/element/src/__tests__/transform.test.ts` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/element/src/align.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/binding.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/collision.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/delta.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/distribute.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/dragElements.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/elbowArrow.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/linearElementEditor.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/listMarker.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/resizeElements.ts` | OBS-037, OBS-029 | Forward host metrics; retain anchored image/embed protections. |
| `packages/element/src/shape.ts` | OBS-019, OBS-036 | Adopt arrowhead bounds; only inherited inert WeakMap cleanup remains a fork difference. |
| `packages/element/src/stickyNote.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/element/src/textElement.ts` | OBS-009 | Adopt arrow-label sizing; retain persisted legacyTextWrap geometry. |
| `packages/element/src/transform.ts` | OBS-009, OBS-036 | Adopt endpoint positioning/rebinding/label measurement; retain rawText on converted labels. |
| `packages/element/tests/binding.test.tsx` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/element/tests/elbowArrow.test.tsx` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/element/tests/linearElementEditor.test.tsx` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/element/tests/shape.test.ts` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/CHANGELOG.md` | OBS-001, OBS-007, OBS-009, OBS-011 | Adopt upstream release notes; retain historical fork notes without changing current contracts. |
| `packages/excalidraw/actions/actionAlign.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/actions/actionDistribute.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/actions/actionFlip.ts` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/actions/actionHistory.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/actions/actionProperties.tsx` | OBS-015, OBS-022, OBS-025, OBS-026 | Adopt host metrics and elbow rerouting; retain palette/stroke/font/frame host behavior. |
| `packages/excalidraw/actions/actionStyles.ts` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/actions/actionTextAutoResize.ts` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/components/App.duplicate.ts` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/components/App.selectionTool.ts` | OBS-029 | Adopt metrics during crop/move; retain unlocked-hit precedence and host selection semantics. |
| `packages/excalidraw/components/App.text.ts` | OBS-009, OBS-026 | Adopt metrics; retain Markdown source preparation/submission and unchanged-text history. |
| `packages/excalidraw/components/App.tsx` | OBS-007, OBS-008, OBS-010, OBS-011, OBS-014, OBS-015, OBS-016, OBS-017, OBS-019, OBS-020, OBS-021, OBS-022, OBS-023, OBS-024, OBS-027, OBS-028, OBS-029, OBS-030, OBS-032, OBS-037 | Adopt host metrics in deltas/bindings; retain existing props, lifecycle and APIs. |
| `packages/excalidraw/components/App.wrap.ts` | OBS-009, OBS-010 | Adopt metrics; retain explicit-link transfer and raw source on wrap/unwrap. |
| `packages/excalidraw/components/ConvertElementTypePopup.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/components/Stats/Angle.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/components/Stats/MultiDimension.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/components/Stats/MultiPosition.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/components/Stats/Position.tsx` | Upstream | Adopt upstream host metrics/binding forwarding; existing fork behavior preserved where present. |
| `packages/excalidraw/components/Stats/utils.ts` | OBS-027 | Adopt bound-label metrics; retain gridSize editable-property extension. |
| `packages/excalidraw/components/TTDDialog/Chat/useChatAgent.ts` | Upstream | Adopt upstream Pele errors/autofix and optional chat renderer metadata; host converter remains external. |
| `packages/excalidraw/components/TTDDialog/MermaidToExcalidraw.tsx` | OBS-030, OBS-031 | Adopt host preview metrics; retain selected-image source, sample and preview behavior. |
| `packages/excalidraw/components/TTDDialog/TTDDialogOutput.tsx` | Upstream | Adopt upstream Pele errors/autofix and optional chat renderer metadata; host converter remains external. |
| `packages/excalidraw/components/TTDDialog/TextToDiagram.tsx` | OBS-030 | Adopt Pele source-aware repair/metrics; retain always-visible preview workaround. |
| `packages/excalidraw/components/TTDDialog/common.ts` | OBS-030 | Resolve source metadata override against host renderEnvironment; copy readonly image skeletons. |
| `packages/excalidraw/components/TTDDialog/hooks/useMermaidRenderer.ts` | OBS-030 | Adopt host metrics; retain queued latest-content/ready-state refresh. |
| `packages/excalidraw/components/TTDDialog/types.ts` | Upstream | Adopt upstream Pele errors/autofix and optional chat renderer metadata; host converter remains external. |
| `packages/excalidraw/components/TTDDialog/utils/mermaidAutoFix.test.ts` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/components/TTDDialog/utils/mermaidAutoFix.ts` | Upstream | Adopt upstream Pele errors/autofix and optional chat renderer metadata; host converter remains external. |
| `packages/excalidraw/components/TTDDialog/utils/mermaidError.test.ts` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/components/TTDDialog/utils/mermaidError.ts` | Upstream | Adopt upstream Pele errors/autofix and optional chat renderer metadata; host converter remains external. |
| `packages/excalidraw/data/restore.ts` | OBS-009, OBS-010, OBS-012, OBS-013, OBS-015, OBS-016, OBS-030 | Adopt stripping leaked transient arrow option; retain all persisted host fields and legacy image behavior. |
| `packages/excalidraw/history.ts` | Upstream | Adopt upstream binding/routing/label-metrics implementation verbatim; no added host customization. |
| `packages/excalidraw/mermaid.test.ts` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/mermaid.ts` | Upstream | Adopt upstream swimlane detection; preserve host loader through existing ringfenced modules. |
| `packages/excalidraw/package.json` | OBS-002, OBS-003, OBS-004 | Converter 3.0.0 remains dev-only; preserve external runtime and fork identity/build exports. |
| `packages/excalidraw/scene/export.ts` | OBS-007, OBS-009, OBS-015, OBS-018 | Adopt CPU-backed PNG context before rough canvas; retain host labels, frame colors and marker filtering. |
| `packages/excalidraw/tests/MermaidToExcalidraw.test.tsx` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/tests/__snapshots__/history.test.tsx.snap` | Upstream | Adopt only incoming snapshots; restore local test:update rewrites from index. |
| `packages/excalidraw/tests/__snapshots__/move.test.tsx.snap` | Upstream | Adopt only incoming snapshots; restore local test:update rewrites from index. |
| `packages/excalidraw/tests/data/restore.test.ts` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/tests/renderEnvironmentLabels.test.tsx` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/tests/scene/export.test.ts` | Upstream | Adopt incoming regression coverage verbatim; broad legacy harness limits remain explicit below. |
| `packages/excalidraw/wysiwyg/textWysiwyg.tsx` | OBS-009, OBS-010, OBS-021, OBS-024 | Adopt metrics during label resize; retain host suggester, scaled input and source behavior. |
| `scripts/stats/bundle-stats-plugin.mts` | Upstream | Adopt upstream web-app measurement/CI tooling verbatim; excluded from Obsidian runtime. |
| `scripts/stats/perf.mjs` | Upstream | Adopt upstream web-app measurement/CI tooling verbatim; excluded from Obsidian runtime. |
| `scripts/stats/post.mjs` | Upstream | Adopt upstream web-app measurement/CI tooling verbatim; excluded from Obsidian runtime. |
| `scripts/stats/vite.config.mts` | Upstream | Adopt upstream web-app measurement/CI tooling verbatim; excluded from Obsidian runtime. |
| `tsconfig.json` | Upstream | Adopt upstream common/element type-subpath mappings required by converter 3 declarations. |
| `yarn.lock` | OBS-002 | Regenerate from merged manifests using fork lock as base; retain security pins, prune obsolete Mermaid dependencies. |
