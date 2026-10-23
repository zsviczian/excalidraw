# PR #472 merge review — lazy web dependencies, preserved Obsidian loading

## Published-declaration correction — 2026-10-23

The original integration lane below copied four runtime artifacts into an
installed **0.18.143** package. It did not validate the new declarations after
publication of **0.18.144**. On plugin master `a1da1bbe`, with the maintainer's
existing dependency/lockfile update to 0.18.144 installed, `npm run build`
reproduces TS2322 in `obsidianExcalidrawHostAdapter.ts:31` while still emitting
dist. That output is not a successful type integration check.

The fork correctly kept `{loaded, api}` as `ObsidianMermaidService`, but the
plugin's manually repeated ambient adapter and public `loadMermaid()` return
type still referenced `TTDDialog`'s now status-based UI type. The repair is in
`P: src/types/excalidrawLib.d.ts`: derive the adapter, protocol constant,
registration function and loader directly from the published fork declarations.
No fork runtime, host protocol, public service shape, Extras implementation,
scene field or migration behavior changes. No cast, added status property,
fallback or feature removal is needed. The existing ringfenced host adapter
and dialog shim remain necessary; no further fork retirement is justified.

`P: scripts/testing/hostContracts.test.mjs` checks the real plugin adapter,
producer, registration and public loader against the installed canonical types,
in both directions. It fails on the original declarations and passes after the
repair. `npm run build` now runs it as a prebuild gate, so this mismatch produces
a nonzero build result before Rollup can emit misleading output. It checks this
boundary rather than suppressing or accepting other compiler diagnostics.

Verification uses the **published** 0.18.144 tarball: its SHA-512 matches the
existing lockfile, and all **621** installed declaration/runtime files match
the tarball byte-for-byte. No local runtime artifacts or declarations are
substituted, no dependency/version is changed by this repair, and nothing is
published or committed. Production and library builds pass without TS2322;
production has no TypeScript diagnostics. Development retains the existing
five TS7006 diagnostics in CLI/view files and the sourcemap-option warning.
The changed declaration has zero ESLint findings; test scripts are excluded
by the repository ESLint configuration and pass Node syntax/execution checks.
The new contract test, **14** focused fork Mermaid/host tests and **15** plugin
bundle/CLI-harness tests pass. The older full-suite failures below are not
claimed fixed or rerun for this type-only consumer repair.

Windows Obsidian 1.14.4 native checks against the published installed package
pass plugin reload/mount, a declined Mermaid service and rejected API,
subsequent real-Extras conversion while the main renderer is offline, editable
image source metadata, selected-source canvas previews in main and popout,
public loaded/api shape, one shared host lookup with four parser calls, and
byte-preserving save/reopen. Final error collection and owned-file/controller
cleanup pass. Offline emulation and the host observer are restored. Initial
probe attempts passed the feature checks but failed Windows empty-directory
cleanup; the final probe uses a UUID-owned drawing file without creating a
directory. No production code is changed to accommodate those probe failures.

Final main.js: **4,985,148 bytes**, **257,732 bytes** headroom; SHA-256
`e86ac09851cec8f2f45a33fa64d3bfcd91a1e8d0fefb0f4942191e694afacd6e`.
Local evidence: plugin `tmp/pr472-repair-*`, particularly
`pr472-repair-native/report.json`, `pr472-repair-package/provenance.json`,
before/after contract/build logs and development/library logs. The report
identifies plugin `a1da1bbe` plus local changes and published component 0.18.144.
Source inventory additionally acknowledges the already committed
`9d1e20b60` manifest-only version bump; it changes no further source hash.

Remaining manual gates: cold application startup, restored popouts,
macOS/Linux and physical mobile. Highest-probability checks are declining then
enabling Extras, lazy conversion/retry, selected-source preview and saving the
source in main/popout editors. No whole-product zero-regression claim follows
from these bounded checks.

## Original merge checkpoint (2026-10-21)

2026-10-21. [PR #472](https://github.com/zsviczian/excalidraw/pull/472).
Fork parent: `dc5c28baa52884d576db4c4470907e192123b527`.
Incoming upstream: `1d4dc2c0e6e476911d0760e9c3cf3694f2d43384`.
Merge base: `bee01e3a12812c930109aa91242658709480bbf3`.
Incoming commits: `6f0a4d19b` (quota error compatibility) and `1d4dc2c0e`
(lazy Firebase/Mermaid, cache policy, loading/retry UI).
Plugin consumer: clean master `a1da1bbe738df4a6a640b7c1c7fdab0a1c5da8b5`;
plugin/Extras 2.29.0, declared/installed component version 0.18.143.
Local generated artifacts are used for integration, without publication,
version changes, dependency edits, or plugin source changes.

## Meaning of “don't precache”

This is the standalone web app's service-worker installation policy for
JavaScript modules. It no longer downloads Firebase and Mermaid-only chunks
in advance; those chunks load when needed and use runtime CacheFirst caching.
It is not a change to drawing attachments, image decoding, vault synchronization,
or Obsidian's local-file-to-scene loader. The web app's Firebase/Workbox graph
is outside the Obsidian artifact entry graph. All eight incoming web-app paths
match upstream verbatim. No Firebase service is introduced into the plugin.

Mermaid still comes exclusively through the plugin-provided host interface,
backed by Excalidraw Extras. The active component code never imports its own
Mermaid implementation. React peers, four-file Obsidian artifact packaging,
local image readiness and the migration/persistence boundary are unchanged.

## Three-way decisions and complete incoming path account

Base, fork and upstream versions were inspected for the three conflicted files.
The resolved result was compared with both parents, including automatic merges.

| Incoming path(s) | Decision and compatibility evidence |
| --- | --- |
| `excalidraw-app/App.tsx`, `collab/Collab.tsx` | Adopt upstream offline collaboration gating, initial status and debounced listener cleanup; web-app-only. |
| `excalidraw-app/components/ExportToExcalidrawPlus.tsx` | Adopt upstream lazy upload helper; web-app-only. |
| `excalidraw-app/data/LocalData.ts` | Adopt Firefox/legacy WebKit quota error names/codes; no plugin vault writer change. |
| `excalidraw-app/data/firebase.ts`, `data/firebaseSDK.ts`, `tests/firebase.test.ts` | Adopt upstream lazy SDK, retryable failed promises, and whole-save rejection on SDK load failure. Focused failure-path test passes. |
| `excalidraw-app/vite.config.mts` | Adopt upstream lazy-chunk graph accounting, shared helper chunk, precache exclusions and bounded runtime cache; not used by Obsidian bundling. |
| `packages/excalidraw/components/App.clipboard.ts` **conflict** | Preserve the existing host loader, moving it inside upstream's try/catch so failed conversion/loading falls back to ordinary text. No module import. Other host paste/file/selection guards remain. |
| `components/TTDDialog/TTDDialog.tsx` **conflict** | Adopt upstream status/retry and exact-API result guards. Preserve post-mount host activation, unmount guard, yielding to host activation prompts, autofocus behavior and selected Mermaid source. Use the owning window for online status. Replaced upstream loader is retained in a fingerprinted comment. |
| `components/TTDDialog/hooks/useTextGeneration.ts` **conflict** | Adopt upstream verbatim: validation now takes the dialog's API, which is already host-supplied. Retire the redundant direct host lookup, not the behavior. Pending validation uses the latest retry API. No separate bundled import remains. |
| `components/TTDDialog/MermaidToExcalidraw.tsx` | Adopt upstream status/retry UI; retain selected-image source seeding and the existing fork starter example. |
| `components/TTDDialog/TTDDialogOutput.tsx`, `TTDPreviewPanel.tsx` | Adopt upstream loading/error/online-reload versus retry controls; exact upstream files. |
| `components/TTDDialog/TextToDiagram.tsx` | Adopt status, guarded insert and API forwarding; retain always-visible preview keyboard workaround. |
| `components/TTDDialog/hooks/useMermaidRenderer.ts` | Adopt status guard; preserve pending-content and completed-preview refresh behavior, updating its guard/dependency to status. |
| `components/TTDDialog/common.test.ts` | Adopt upstream status fixture; existing conversion/source-retention implementation unchanged. Two tests pass. |
| `components/TTDDialog/types.ts`, `utils/mermaidError.ts` | Adopt upstream UI status and module-load-error classification verbatim. Keep that UI type separate from the stable host service. |
| `packages/excalidraw/locales/en.json` | Adopt upstream new load/reload text; retain all preexisting fork labels. |
| `packages/excalidraw/tests/MermaidToExcalidraw.test.tsx` | Adopt upstream chunk-load UI assertion. The older broad UI harness is failing; this suite is not claimed as passing. |

Paths in the table after the first package-qualified component are relative to
`packages/excalidraw/`. These are all **21** incoming paths.

Additional necessary integration owners: `obsidianExcalidrawHost.ts` names
`ObsidianMermaidService` with the preexisting `{loaded, api}` shape;
`obsidianUtils.ts` and public loaders retain that shape. Host protocol stays 2.
`MermaidToExcalidrawLib.ts` adapts to upstream UI status without loading a
second library, releases a rejected API cache, consumes disabled-service
rejections, and attributes parser chunk failures to the exact API. Its five
new tests independently cover activation retry, host rejection, cache recovery,
public shape, config forwarding and chunk-versus-syntax attribution.

OBS-006/030 contracts and existing OBS-031 branding remain. One entire file
fork difference retires (`useTextGeneration.ts`), and one fork-only test is
added. Ledger: **160 modified, 35 fork-only, 39 upstream-only** (234 paths).
Complete source trees: **1,316 fork / 1,320 upstream**. Original ZIP provenance
is unchanged; current provenance is pinned to the incoming commit above.

## Executed validation

Windows, Node **v22.22.3**, Yarn **1.22.22**, npm **12.0.2**;
Obsidian **1.14.4**, installer **1.14.0**.
Evidence root outside both repositories:
`C:/Users/viczi/AppData/Local/Temp/excalidraw-pr472-20261021/`.

- `yarn --cwd packages/excalidraw build:obsidian`: passes, including package
  declarations. Rebuilt after final source/type/import adjustments.
- `yarn vitest run packages/excalidraw/components/TTDDialog/MermaidToExcalidrawLib.test.ts packages/excalidraw/obsidianExcalidrawHost.test.ts packages/excalidraw/components/TTDDialog/common.test.ts excalidraw-app/tests/firebase.test.ts --maxWorkers=2 --minWorkers=1 --exclude 'tmp/**'`:
  **4 suites / 15 tests pass** (`focused-final.log`). Firebase's deliberately
  failed SDK test emits the expected missing local Firebase-config diagnostic.
- Targeted ESLint for clipboard, dialog, helper/test, renderer hook, host registry
  and host utilities: **zero errors or warnings** (`lint-final.json`). JSON
  formatter avoids a local stylish-formatter module-loading failure.
- `yarn test:typecheck`: **fails with the same three documented baseline test
  diagnostics**: `obsidianExcalidrawHost.test.ts:132` matcher typing,
  `tests/fixtures/elementFixture.ts:59` missing rawText,
  `tests/queries/toolQueries.ts:8` Mermaid tool index. No clean full typecheck
  is claimed (`typecheck.log`); artifact declaration compilation passes.
- Required `yarn test:update --maxWorkers=2 --minWorkers=1 --exclude 'tmp/**' --exclude '**/node_modules/**' --exclude '**/dist/**'`:
  **79 suites pass / 79 fail; 1174 tests pass / 1458 fail, 47 skipped, one
  todo; three errors** (`test-update.log`). Older window.h/host setup failures
  continue. Prior #471 recorded the same 79 failing suites and three errors;
  that is historical comparison, not a fresh exact-parent whole-suite run.
  The new upstream UI assertion cannot establish a product failure through this
  broken harness. All generated snapshot and inline-snapshot changes restored.
- Plugin `npm run dev` and `npm run build`: both pass with existing package
  declaration/source-map and circular-dependency warnings. Only the four local
  generated component artifacts were copied into installed node_modules.
- Plugin `npm run test:bundle`: **4/4 pass**. Final production main.js:
  **4,985,148 bytes**, 257,732 bytes below 5 MiB (5,242,880).
- `python dev-docs/Obsidian/test_audit.py` and pinned source comparison:
  **15/15 checker tests pass; 234 reviewed differences and complete tree
  fingerprints match**. No generated artifacts enter the source patch.

Initial restricted-process build/test attempts failed with local esbuild
AccessDenied, before executing checks. Authorized worker-process retries above
pass; those initial attempts are not counted as successful tests.

## Native Obsidian evidence

Only `C:/Obsidian/excalidraw-test` was deployed to or mutated.
`npm run verify:obsidian -- --native-cli` with `EXCALIDRAW_TEST_VAULT_NAME`,
`EXCALIDRAW_TEST_VAULT_PATH`, `EXCALIDRAW_TEST_CONFIG_DIR` and
`EXCALIDRAW_TEST_REPORT_DIR` set to that vault and `native/` evidence directory
**passes**, with clean error and cleanup gates (`native/report.json`). It
covers ordinary drawing load, real local image inventory/read/export,
guarded edits, trusted scripts, SVG/PNG policies and save/reopen. Native
report records the fork parent plus dirty merge source and all artifact hashes;
the final production artifact hash below is identical to the native-tested one.

A separate real-Extras probe (`feature.js`, `feature-result.json`) forces the
main renderer offline using Electron CDP network emulation. With installed,
already active Extras 2.29.0, it passes real pie-diagram conversion, image
`customData.mermaidText`, selected-source canvas preview in main and popout,
one shared host lookup, and byte-preserving local source save/reopen. Parser
calls are observed through a temporary host wrapper; the original implementation
performs conversion. Offline status, wrapper, EA/controller, owned views/files
and verified-empty folders are restored/removed. `feature-errors.txt` says
**No errors captured**. There is no network installation/download claim.

Earlier feature attempts had probe-only assumptions: sequence diagrams can
produce native elements, the source literal was initially escaped, and the
preview is a canvas rather than SVG. These attempts failed their probe
assertions; no production fix was made for them. Empty-folder deletion via
this Obsidian runtime returned EISDIR; native Remove-Item removed only the
four verified-empty, exact owned paths after containment checks.

Production component JS SHA-256:
`1cc729e43e8b18749913a32e6e2ab315cb97e4ce97d25e67ab81d1e5c376f182`.
Production component CSS:
`0337e307594435b5125d216c9570aad9b5d4460908f3f0e716baf1daa87ac002`.
Plugin main.js:
`c93cb29dba0a30db5554a97942a0259da5f7c303d9b058e6850327cf011469ea`.
The native report also records manifest, styles and development hashes. A later
comment/type-import-only rebuild changes development bytes without changing the
production artifact; `build-obsidian-final.log`/`plugin-development.log` record
that build. Original installed component bytes are backed up outside the repo
and restored after integration; no claim that these preexisting bytes have
published-package provenance.

## Remaining scope and risk

No zero-regression certification: broad tests/typecheck are not green, and no
physical mobile, macOS/Linux, or deployed web-app Firebase/PWA scenario was run.
The most likely affected manual workflow is enabling previously disabled
Extras then reopening Mermaid; retry/cache behavior has focused test coverage,
while the real native lane used enabled Extras. Before a component release,
check that activation flow on mobile and macOS and verify ordinary local images
in an existing drawing. Keep the paired published-package handoff separate from
this authorized upstream merge. No scene/image loader correction or cache
migration is needed or included here.
