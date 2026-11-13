# PR #483 upstream merge review

Incoming upstream: `82d5847e57dcb6fb5982833ea9ec2137fe0b2bd5`.
Fork parent: `9108457500f24844456a3d354eb395976cef3824` (`master`, clean).
Merge base: `701b901a0f1ba3d0b390d9cdf63d112e25abac4b`.
Plugin: `2026-11-12-issue-2714-embed-reliability-bundle`, initially clean.
The package version 0.18.147 predates this merge; no release, dependency or
protocol change is included. Both repositories have independent histories.

## Behavior accounting

The only conflicted path is `components/Actions.tsx`. All 37 incoming paths,
including the clean auto-merges, are reviewed against both parents. The base,
fork and upstream conflict stages were inspected before resolution.

- **OBS-022/024, tray zoom:** the old `ZoomActions.trayMode` prop existed only
  to attach a CSS class to upstream's Stack wrappers. Upstream replaces those
  wrappers with a flex container. Adopt the new ZoomActions verbatim apart
  from live host limits; the fork-only TrayMenu owns the class/positioning.
  Its right-hand zoom island also owns a minimap, so the action cannot toggle
  an invisible map. The ordinary upstream Footer remains byte-identical.
  Retire that prop/wrapper customization, retaining the stable OBS IDs, the
  tray itself and all host editing controls. No public imperative API changes.
- **OBS-022, layout gate:** a physical form-factor check does not describe
  host-forced mobile/full/tray modes. Use `isFullPanelMode(app)` (full **and**
  tray) and explicitly include compact. Keep height, navigation and UI gates.
  Full/tray/compact, mobile, short editors and opt-out paths have owned tests.
- **OBS-028, zoom:** retain wheel modifier/composed-path behavior and live host
  minimum after upstream exposes centered wheel zoom for the minimap. The
  new menu must also read `getZoomMin/Max()` rather than upstream constants;
  otherwise it disables a valid host maximum above 3000% or fails to reflect
  a lower configured limit. Upstream viewport gesture ownership is adopted
  verbatim, including idempotent external-gesture release and unmount guard.
- **OBS-003/020, offline minimap:** upstream already has a complete main-thread
  renderer. The single evaluated artifact has no worker module URL. Select
  that existing renderer directly rather than attempting a worker and warning
  on every toggle. ESM retains the worker path. No network loader, extra asset,
  blob worker or runtime chunk is introduced; React/Mermaid stay external.
- **OBS-021, menus:** the new zoom menu uses the existing owner-document body
  portal and travelling class/variables. Keep the existing portal. Browser input reproduced the minimap covering Reset; host CSS raises the travelling zoom-menu class to the main-menu stacking level. Both built artifacts pass the unchanged hit test after correction. Browser
  and native cases assert real hit testing, reset/close and popout ownership.
- **OBS-008/032, state/theme:** accept upstream minimap default false and its
  browser-only storage classification; it is absent from exported drawings.
  All host fields/initState forwarding remain. Move the theme class toggle as
  upstream does, before state observers that read minimap colors; preserve
  host synchronization and all subsequent callbacks. No settings schema change.
- **OBS-014/015/016/018/027/029:** upstream's canvas transform optimization is
  scoped by the existing saved context. Keep custom-pen fill/outline, image/PDF
  inversion, iframe magnification, marker rendering/palettes and selection
  widths. Scene's upstream disposer is now idempotent after destroy; retain
  fork insertion index/frame-aware highlighter behavior. None of these active
  customizations is replaced by the minimap or safe to retire.
- **OBS-007/009/010/011/013/023/025/026/030/031/036/037:** constants, action
  registries, props/types, icon/localization/styles and menu auto-merges retain
  their prior fork differences. New UI config opt-out is additive; existing
  ui=false/zoom-only forms remain supported, including memoized updates.
  Frame-role/finalize, raw Markdown, link callbacks, fonts, host menus, lazy
  Extras Mermaid, public exports and saved compatibility are unchanged.
- **OBS-033, tests:** incoming upstream test/snapshot changes remain verbatim.
  Independent owned tests add intended host behavior, actual artifact pixels,
  trusted browser wheel/pan, zoom menus and teardown. Existing plugin native
  Zen tests now choose reset through the upstream menu while retaining every
  geometry, hit-test, direction, scale, touch and window assertion. The new
  native minimap case is registered in the complete profile and feature map.

## Incoming path checklist

| Incoming path | Existing affected inventory groups |
| --- | --- |
| `packages/common/src/constants.ts` | OBS-013, OBS-022, OBS-025, OBS-026, OBS-028, OBS-036 |
| `packages/element/src/Scene.ts` | OBS-014, OBS-029 |
| `packages/element/src/renderElement.ts` | OBS-014, OBS-015, OBS-016, OBS-018, OBS-027 |
| `packages/excalidraw/CHANGELOG.md` | OBS-001, OBS-007, OBS-009, OBS-011 |
| `packages/excalidraw/actions/actionToggleMinimap.tsx` | OBS-022, OBS-028 (new narrow gate) |
| `packages/excalidraw/actions/index.ts` | OBS-015, OBS-022, OBS-028 |
| `packages/excalidraw/actions/types.ts` | OBS-015, OBS-022, OBS-028, OBS-036 |
| `packages/excalidraw/appState.ts` | OBS-008, OBS-015, OBS-025, OBS-026, OBS-027, OBS-028, OBS-036 |
| `packages/excalidraw/components/Actions.scss` | OBS-024 |
| `packages/excalidraw/components/Actions.tsx` | OBS-015, OBS-022, OBS-023 |
| `packages/excalidraw/components/App.tsx` | OBS-007, OBS-008, OBS-010, OBS-011, OBS-014, OBS-015, OBS-016, OBS-017, OBS-019, OBS-020, OBS-021, OBS-022, OBS-023, OBS-024, OBS-027, OBS-028, OBS-029, OBS-030, OBS-032, OBS-037 |
| `packages/excalidraw/components/App.viewport.ts` | Upstream-identical |
| `packages/excalidraw/components/App.wheel.ts` | OBS-028 |
| `packages/excalidraw/components/CommandPalette/CommandPalette.tsx` | Upstream-identical |
| `packages/excalidraw/components/LayerUI.scss` | OBS-024 |
| `packages/excalidraw/components/LayerUI.tsx` | OBS-008, OBS-022, OBS-024 |
| `packages/excalidraw/components/Minimap/Minimap.scss` | Upstream-identical |
| `packages/excalidraw/components/Minimap/Minimap.tsx` | Upstream-identical |
| `packages/excalidraw/components/Minimap/MinimapAnnouncementDot.tsx` | Upstream-identical |
| `packages/excalidraw/components/Minimap/minimap-controller.chunk.ts` | OBS-003, OBS-020 (new artifact fallback gate) |
| `packages/excalidraw/components/Minimap/minimap-shared.chunk.ts` | Upstream-identical |
| `packages/excalidraw/components/Minimap/minimap-worker.chunk.ts` | Upstream-identical |
| `packages/excalidraw/components/footer/Footer.tsx` | Upstream-identical |
| `packages/excalidraw/components/icons.tsx` | OBS-015, OBS-023, OBS-024, OBS-026 |
| `packages/excalidraw/components/main-menu/DefaultItems.tsx` | OBS-031 |
| `packages/excalidraw/css/styles.scss` | OBS-014, OBS-022, OBS-024 |
| `packages/excalidraw/index.tsx` | OBS-005, OBS-006, OBS-007, OBS-009, OBS-010, OBS-013, OBS-030 |
| `packages/excalidraw/locales/en.json` | OBS-015, OBS-026 |
| `packages/excalidraw/tests/__snapshots__/MermaidToExcalidraw.test.tsx.snap` | Upstream-identical |
| `packages/excalidraw/tests/__snapshots__/contextmenu.test.tsx.snap` | Upstream-identical |
| `packages/excalidraw/tests/__snapshots__/excalidraw.test.tsx.snap` | Upstream-identical |
| `packages/excalidraw/tests/__snapshots__/history.test.tsx.snap` | Upstream-identical |
| `packages/excalidraw/tests/__snapshots__/regressionTests.test.tsx.snap` | Upstream-identical |
| `packages/excalidraw/tests/interactivity.test.tsx` | Upstream-identical |
| `packages/excalidraw/tests/minimap.test.tsx` | Upstream-identical |
| `packages/excalidraw/tests/zoomMenu.test.tsx` | Upstream-identical |
| `packages/excalidraw/types.ts` | OBS-007, OBS-008, OBS-009, OBS-010, OBS-014, OBS-015, OBS-016, OBS-017, OBS-022, OBS-027, OBS-029, OBS-030 |

Upstream-identical files have no ledger row because they introduce no fork
difference. The new action/controller acquire narrowly fingerprinted rows;
TrayMenu, host CSS and owned test mappings are maintained with them. All hashes
are compared with the exact incoming commit, rather than a stale remote ref.

## Validation

- **Complete portable:** `npm run test:regression:portable` passes **1004 canonical cases**, including 776 plugin fast cases, 157 fork-owned source cases with unchanged coverage floors, both actual browser artifacts, Extras and both packed consumers. Report: `P: .test-work/reports/pr483-portable/`.
- **Fork source:** full `yarn test:typecheck` and owned types pass. Coverage is 47.81% lines/statements, 64.26% branches and 44.82% functions. Fifteen inventory checker tests and the exact 274-path baseline comparison pass. New code/tray/tests have zero ESLint warnings; Actions retains its existing unused Card/runAction and import-order warnings.
- **Builds:** ESM, Obsidian development/production artifacts and declarations, plugin production/library and bundle contracts pass. Production plugin main.js is **5,139,573 bytes**, leaving **103,307 bytes** below the 5 MiB target. No publication/version/dependency change.
- **Actual browser failure and fix:** two failed reports preserve the zoom menu being covered by the minimap, including a stable 30-second trusted-click timeout. The portal-safe host CSS correction passes the same hit test in both artifacts.
- **Focused native:** `verify:obsidian:plugin -- --minimap` passes the registered case in **six variants**: main/popout x full/compact/tray. Asserted actual minimap pixels, document/footer ownership, centered wheel, live host limits, menu reset, toggle removal and teardown. Error and cleanup gates pass. The initial full-run helper retained a pre-zoom DOM button. Its toggle-off failure did not recur after re-querying the current button following state transitions, as the browser locator does; no product workaround was introduced for that helper correction.
- **Complete native is not green:** current run is on **Obsidian 1.15.0**, installer 1.14.5, Electron 43.8.3, Windows. All 172 recorded main/split/nested/popout behavioral cases and all 43 phone behavioral cases passed. Table controls failed (`native:embed-table:main`), and phone Reading-preview controls had an off-screen hit target. Both embed-control findings are deferred by the maintainer to [plugin #3049](https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/3049); no plugin production fix is included. Unexecuted downstream native cases remain unfinished, not passed.
- **Other retained failures:** initial preparation rejected concurrent primary K-Plex edits before deployment. Use clean isolated K-Plex `ae558b7ccf0cc817b11779b78a30c52710ca1f90`; its primary worktree is preserved. A transient first-open readiness failure recovered through installed CLI help, exact vault identity and benign eval checks. A separate full workflow retry hit stable-idle/text-save failures before reaching minimap; its evidence remains and is not called a pass.

Reports are retained under `P: .test-work/reports/pr483-regression/`,
`pr483-regression-isolated/`, `pr483-regression-ready/`,
`pr483-workflow-focused/`, `pr483-minimap-focused/` and `pr483-portable/`.
Failed reports are not overwritten. The explicit focused `--minimap` option is
not a substitute for a complete native pass; the full profile still requires it
alongside every existing workflow. Offline native runner guards pass 13 cases.

**Pre-merge A/B result:** a clean isolated checkout of exact fork parent
`9108457500f24844456a3d354eb395976cef3824`, installed from its frozen Yarn
lockfile and rebuilt by the normal coordinator, reproduces both failures.
`native:embed-table:main` fails at the identical ownership assertion; phone
Reading preview controls are off-screen at **x=-107** with both parent and
candidate. Both runs complete owned cleanup and device restoration. Evidence:
`P: .test-work/reports/pr483-parent-embed-baseline/`. These observed failures
predate PR #483; no plugin production fix or weakened expectation is included.
The maintainer requested a separate issue for table controls and then added the phone finding to the same issue, now #3049. Plugin development integration also passes; its existing Rollup source-map warning remains.

The complete native run remains failed, with later cases unexecuted. This is a
source merge with validated affected workflows and documented baseline defects,
not a clean complete-native or release acceptance claim. Final candidate
restoration and lifecycle/wheel/minimap confirmation are recorded below.
See [machine-readable evidence](pr-483-results.json).

Highest-probability merge regressions are a missing/covered tray minimap, a
popout zoom menu behind another layer, stale host zoom limits, or Zen reset/exit
overlap. Preserve separate main/popout, LTR/RTL, narrow, light/dark, compact/tray
and touch-layout evidence. Physical Android/iOS, other desktop operating systems
and an isolated whole-application cold restart remain separate environments.

## Final candidate confirmation

The candidate was rebuilt and restored after the pre-merge comparison.
`verify:obsidian:plugin -- --lifecycle --wheel-zoom --minimap` passes all 11
recorded canonical cases, including dirty migrations/reload, main/popout live
zoom limits and all six minimap variants. Error, source-stability and cleanup
gates pass. Production main.js remains 5,139,573 bytes. Plugin development
build also passes (existing Rollup source-map warning). These focused results
do not replace the separately failed complete native profile. Both table and
phone findings are tracked in plugin #3049 at the maintainer's request.
