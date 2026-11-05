# PR #482 upstream merge review

Reviewed 2026-11-05. Fork parent `a46e7001b3f837468ff84a0ae00d5681f4b6f402`,
incoming upstream `701b901a0f1ba3d0b390d9cdf63d112e25abac4b`, merge base
`dd2f8fc32b92cbf56f4abee6a0cf3b14681b4b55`.

## Behavior accounting

The clipboard import conflict keeps both upstream's conversion configuration
and the fingerprinted host loader. Conversion stays inside the text-fallback
handler. Host file interception, zoom-aware text size and raw Markdown remain
unchanged. The manifest conflict puts converter 3.6.0 in devDependencies only;
internal workspace math and runtime Mermaid remain absent. Fork identity,
version 0.18.146, exports, scripts and security pins are preserved.

The active dialog loader is fork-owned, so upstream's new elbow default must
also move there. `loadMermaidDialogAPI` uses the upstream constant only when
the caller omits configuration. Explicit caller configuration remains intact.
The commented upstream loader tracks its new default. Public loaded/api,
activation/retry/cache behavior, conversion queue, latest-preview scheduling,
readonly skeleton handling and `customData.mermaidText` remain with their
existing owners. Plugin EA conversion retains its explicit options semantics.
Selected image source and always-on preview remain fingerprinted. No existing
fork runtime customization is retired; the upstream error-line simplification
removes upstream code and is adopted verbatim.

Extras must actually supply converter 3.6.0 / Pele 1.13.0, bundled offline with
all lazy modules. Its service contract remains 3.0.0, distinct from the package
version. Neither host protocol nor package/API/plugin release versions change.
The plugin dependency remains 0.18.146; local four-artifact integration is not
a published-package handoff. Gantt, timeline and quadrant expectations now
require editable elements, preserving labels and geometry assertions. New
browser checks exercise real elbows, explicit curve precedence and original
source-line errors; the native gateway checks real elbow conversion too.

The first integration build exposed a genuine compatibility break: converter
3.6 removes `flowchart.curve`, used by `P: ExcalidrawAutomate.addMermaid()` for
straight/rounded connectors. A negative control against unadapted 3.6 proves
linear and basis produce identical SVG. Extras now retains that option through
the same pinned converter stages, calling its existing `parsePele` curve input.
Ordinary/new calls delegate unchanged to the upstream entry point. Source,
front matter/directives, parser line numbers, font size, limits, image fallback
and native element conversion remain intact. No source injection is used.
The fork's `obsidianMermaidConfig.ts` preserves the old optional property in
public host/EA declarations; Extras exposes the corresponding compatible type.
Generated package consumers check both old curves and new elbows, rejecting
unsupported curves. Node output tests and built-browser geometry tests pass.
These internal converter imports are tied to the exact 3.6.0 pin and must be
reviewed on the next upgrade. No plugin production-source change is necessary.

## Incoming files (all 18)

| Path | Disposition |
| --- | --- |
| `dev-docs/README.md`, `dev-docs/vercel.json` | Upstream documentation redirects verbatim; no plugin runtime consumer. |
| `packages/excalidraw/CHANGELOG.md` | Adopt upstream conversion capabilities; retain fork history. |
| `components/App.clipboard.ts` | Combine upstream defaults with host loader; preserve raw text, font sizing and host paste contract (OBS-009/010/030). |
| `components/TTDDialog/MermaidToExcalidraw.tsx` | Adopt syntax links; retain selected-source and support example (OBS-030/031). |
| `components/TTDDialog/TTDDialog.tsx` | Track disabled upstream loader; active adapter owns equivalent defaults, activation and cleanup (OBS-006/030). |
| `components/TTDDialog/TTDDialogOutput.tsx` | Verbatim upstream source-line formatting call. |
| `components/TTDDialog/TextToDiagram.tsx` | Adopt original source-line repair message; preserve always-on preview (OBS-030). |
| `components/TTDDialog/utils/mermaidError.ts`, `.test.ts` | Verbatim upstream simplification and tests; converter now reports source lines directly. |
| `locales/en.json` | Adopt supported diagram text; preserve fork font/frame labels. |
| `mermaid.ts`, `mermaid.test.ts` | Verbatim upstream default configuration, preamble recognition and linear-time tests. |
| `package.json` | Dev-only converter 3.6.0; preserve other fork packaging (OBS-002/003/004). |
| `tests/MermaidToExcalidraw.test.tsx`, its snapshot | Upstream explicit-default assertion and descriptive text; no accepted fork snapshot rewrite. |
| `tests/clipboard.test.tsx` | Upstream explicit-default assertion; retain host-file and raw-text tests. |
| `yarn.lock` | Exact converter/Pele updates; other fork resolutions unchanged. |

Component paths above are relative to `packages/excalidraw/` unless specified.
Additional fork-owned loader/test changes are required to implement the upstream
default at its actual owner. OBS-033 covers the executable regression evidence.

## Inventory provenance

The pre-merge audit already drifts in nine file rows following #480/#481 and
the existing version 0.18.146: frame helpers, finalize, App selection/movement,
Stats movement, both renderers, changelog and manifest. Their source changes
were compared with incoming upstream: they are already merged upstream frame
insertion/clipping/movement changes and the existing fork version, with prior
fingerprinted customizations intact. They are recorded separately from #482's
changes, not silently accepted as new work. No path or OBS ID retires.

## Validation

**876 portable cases pass:** 659 plugin fast, 148 fork source, 20 fork browser,
30 Extras source and 19 Extras browser. Overlapping source-coverage gates are
not added to that count. Both fork builds, full/owned typechecks, plugin
production/library builds, Extras production/API builds, coverage and both
packed consumers pass. The focused upstream preamble/error suite passes 33
cases. Touched fork and Extras lint has zero warnings; Extras repository lint
retains one existing deprecated-config warning. Fifteen audit tests and all
270 reviewed paths match the incoming upstream tree.

**387/387 Windows native cases pass**, with no missing identities, including
all 258 behavioral obligations and 40 device/layout profiles. Main, split,
nested split, popout, phone/tablet emulation, real services, actual EA legacy
curves/new elbows, CLI authoring, settings/persistence, image/text/history,
large scenes and cleanup are exercised. Host: Obsidian/installer 1.14.5,
Electron 43.8.3, Chromium 150.0.7871.250. Three exact transient ResizeObserver
notifications are retained; all idle/layout gates pass, with zero unexpected
browser/console errors. No observer, threshold or diagnostic-policy change.
Cleanup, baseline restoration and the native negative controls pass.

**The additional real-Extras probe passes 67 dialog assertions, eight SVG paint
cases and ten SVG entry-point cases**, with zero notifications/unexpected
errors and passing cleanup/restoration. It covers declined activation and retry,
13 diagram kinds offline, actual TTD default-elbow insertion, finite geometry
and endpoint bindings, visible exported pixels, selected-image source, light/dark
preview colors, close behavior, main/popout persistence, SVG choices and undo.

The first portable attempt found explicitly undefined optional Gantt skeleton
dimensions; the provided-value guard is corrected while native normalized
geometry remains strictly finite. The unadapted-converter negative control
proves basis was ignored before the compatibility adapter. Supplemental failures
were test setup errors: reacquire the view after the SVG paint probe's own
save/reopen; run cold-service assertions before populating its cache; use browser
platform detection because CLI eval cannot require Obsidian. All affected cases
were rerun without removing assertions. An earlier native preparation rejected
concurrent import-only edits before deployment. Failed reports are retained.

[Sanitized results](pr-482-results.json) preserve case identities, exact tested
sources, artifact hashes, failed attempts and remaining environments. The final
focused run changes only the non-shipped SVG paint harness; every fork/plugin/
Extras runtime and declaration artifact matches the complete native run.
Inventory/review/evidence documentation is finalized after validation.

Plugin `main.js`: **5,064,559 bytes**, SHA-256
`49f0cbac49bd05b5fc4bed32982616d8dc34d77e6274bb578d7c9264db13cdb0`;
**178,321 bytes** below the 5 MiB target. Extras: 2,591,898 bytes, SHA-256
`f2bc78a93d05dc90a18e14df9821ccc55ad6b66c63516195e1628c365c4a5227`.

## Reproduction and handoff

From the plugin checkout, with the one-time repository-local vault/CLI setup:

```powershell
npm.cmd run test:regression:portable
npm.cmd run test:native
Copy-Item ../excalidraw/dev-docs/Obsidian/pr-482-dialog-feature.txt tmp/pr482-dialog-feature.txt
Copy-Item ../excalidraw/dev-docs/Obsidian/pr-482-dialog-runner.txt tmp/pr482-dialog-native.mjs
node tmp/pr482-dialog-native.mjs
```

The replay builds/freezes/deploys current fork/plugin/Extras, holds the application
user-data lock and restores its declared baseline. It uses only the marker-owned
repository-local vault. The combined replay orders cold-service assertions before
SVG scenarios that deliberately populate the shared loader cache.

This merges source only. Extras implementation and plugin regression changes
remain local, with no package publication or plugin dependency update. Current
plugin CI pins are fork `278ed4937dde5fd9e77c83a4e25e5a9b3d8028f7` and Extras
`e247088e1222935a2bb006e94658b639916e0814`; they do not represent this new local
combination. Coordinate durable companion commits, publication and CI pins
before a release. No plugin production source change is required.

Risk-based manual follow-up: complex Mermaid configuration, non-Latin labels,
source editing, export and save/reopen in main and restored popouts. Physical
Android/iOS touch/WebViews, native macOS/Linux and an isolated whole-app cold
restart remain untested. Desktop emulation and plugin reload do not establish
those separate environments.
