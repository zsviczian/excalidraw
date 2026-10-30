# PR #478 upstream merge review

Unpublished three-repository integration, reviewed 2026-10-30. Package/API
versions and the plugin's dependency declaration remain unchanged.

## Inputs and behavior accounting

- Fork parent: `b2e798f37aa646bf81c831d664845806bbc671ee`.
- Incoming upstream: `a758e93d6a03e9f995973703cb886850a398a6d3`.
- Merge base: `14bb42edee3d6fee6be264e3ee78670b3b9cee79` (PR #475).
- Plugin parent: `8a0e294013093ad14bbaf319c8ffa77b0fcf0009`.
- Extras parent: `220e91381d6512d0775812fcff48ba4d116dc7d5`.
- Tested Extras implementation committed as
  `df1f2b5659259c43780c5ef07cd433fa6c3e14fa` (package/API versions unchanged).

The sole manifest conflict is resolved against all three versions: converter
3.1.0 replaces 3.0.0 in devDependencies; upstream runtime math/converter
dependencies stay absent. Fork identity, exports, scripts and security
resolutions remain. The lock update contains only the exact converter record.

The auto-merged TTDDialog change updates a comment inside the fingerprinted,
disabled upstream loader. Active loading still uses the host adapter exactly
once. Extras' dynamic module export is bundled with inlineDynamicImports; every
per-diagram Pele import resolves locally at build time. The plugin still
requests the unreleased 3.0.0 service contract, distinct from converter 3.1.0,
as directed. No network/cache service, host protocol, stored scene field,
plugin production source or PDF change is needed.

OBS-002/003/004/006/030 contracts, OBS-029 placement/public editing and OBS-033
test coverage remain. Public loaded/api aliases, declined activation/retry,
latest queued preview, selected-image source and immutable mermaidText attachment
have active plugin/EA and saved-data consumers. Incoming upstream code does not
replace them, so no runtime customization is retired. D13 remains open.

## Every incoming path

| Path | Disposition |
| --- | --- |
| `.github/workflows/stats.yml` | Adopt upstream web-app measurement verbatim; no Obsidian runtime use. |
| `excalidraw-app/components/AI.tsx` | Adopt web-app chunk caching verbatim; absent from Obsidian payload. |
| `excalidraw-app/data/cacheMermaidChunks.ts` | New upstream web-app helper, unchanged. |
| `excalidraw-app/vite.config.mts` | Upstream chunk-list packaging, unchanged; Obsidian uses its separate builder. |
| `packages/element/src/flowchart.ts` | Verbatim centering, obstacle-gap and rounding corrections; no fork delta. |
| `packages/element/tests/flowchart.test.tsx` | Verbatim upstream tests; independent fork-owned cases supplement them. |
| `packages/excalidraw/CHANGELOG.md` | Adopt converter note, retaining historical fork notes. |
| `packages/excalidraw/components/TTDDialog/TTDDialog.tsx` | Auto-merged comment in disabled loader; fingerprinted host ownership remains. |
| `packages/excalidraw/components/TTDDialog/utils/mermaidError.ts` | Verbatim upstream comment clarification; no fork delta. |
| `packages/excalidraw/package.json` | Dev-only converter pin 3.1.0; preserve other fork fields. |
| `scripts/stats/perf.mjs` | Verbatim alternating-build tooling; no runtime use. |
| `scripts/stats/post.mjs` | Verbatim metadata; its network posting is not executed in validation. |
| `yarn.lock` | Exact converter record only; preserve fork security pins. |

## Validation

**701 portable cases pass:** 503 plugin, 134 fork source, 18 fork browser,
29 Extras source and 17 Extras browser. This adds seven placement cases and
13 built-browser conversion/recovery cases; the version-policy test is updated.
Both package builds, full/owned types, coverage, clean package consumers and
zero-warning owned/Extras lint pass. The focused native gateway repeats twelve
diagram kinds offline and passes the single native PDF/error/cleanup gates.

The full candidate run is **349/357 passed, eight failed**, with all 258
behavioral obligations and 40 device profiles passed. A sustained exact
ResizeObserver notification loop starts at `native:lifecycle-new-popout-survivor`,
before Mermaid is loaded. The eight failures are settling failures; the strict
gate remains failed. There are 22,507 notifications, zero unrelated exceptions,
and passing final cleanup, quiet idle and baseline restoration.

A fresh renderer with freshly rebuilt **pre-merge** fork/Extras reproduces the
same failure after the identical 172 desktop cases: 460 notifications at the
same lifecycle phase, zero unrelated exceptions, passing behavior and cleanup.
Its plugin/fork/Extras hashes reproduce the prior tested artifacts. The reload
is a separate between-run control after completed cleanup, never a mid-run reset
or acceptance pass. This proves the observed loop predates #478; it does not
assign its cause to Obsidian, the plugin or instrumentation. No observer patch,
broader exclusion, idle-threshold change or production workaround is included.

The additional real-Extras diagnostic passes **43 assertions across 13 diagram
kinds**, including swimlane, EA insertion, selected-source previews in main and
popout, PNG export and byte-preserving save/reopen. Zero notifications/errors;
cleanup and baseline restoration pass. Both native negative controls also pass.
An initial swimlane diagnostic incorrectly expected an image; identical offline
browser controls show both 3.0 and 3.1 return the same six editable elements and
labels. The corrected assertion preserves that baseline. Failed evidence is
retained. A completed failed diagnostic controller is retired only after checking
that its owned files are gone; pending work is never discarded.

[Sanitized case results, revisions, hashes and comparison](pr-478-results.json)
record the full native failure separately from the passing feature workflow.
No complete-native-pass claim is made. Plugin main.js is 5,031,203 bytes,
SHA-256 `8854030e4242ab2f91488fde3eb058db6056f9f853f046ca48acb46dc54cafb8`;
Extras is 2,540,802 bytes, SHA-256
`c377df5b7f286c7306604827fadcb363313cebc5a9953b7d77e106fdb611f7d8`.

The first sandboxed esbuild invocation crashed in the native resolver; the same
build with normal native filesystem access passes. New test setup was corrected
to use the real element Scene with valid indices and respect optional converter
skeleton dimensions. Native normalized dimensions retain finite-geometry
assertions. No product behavior or existing assertion was weakened.

The 264-path ledger includes four reviewed existing rows plus the new independent
test, against the incoming tree. Fifteen checker tests and complete source
fingerprints pass. Inventory proves accounting, not runtime behavior.

## Repeatable commands

From the plugin checkout with the existing one-time vault trust/CLI setup:

```powershell
npm.cmd run test:regression:portable
npm.cmd run test:native
npm.cmd run verify:obsidian -- --extras-services --diagnostics
```

The maintained native gateway automatically runs the twelve-kind offline matrix.
For the additional reviewed source-editing diagnostic, copy the runner source
into ignored `tmp/`; it builds/deploys/hash-verifies all three current workspace
revisions under the same application-session lock and restores the baseline:

```powershell
New-Item -ItemType Directory -Force tmp | Out-Null
Copy-Item ../excalidraw/dev-docs/Obsidian/pr-478-dialog-runner.txt tmp/pr478-dialog-native.mjs
node tmp/pr478-dialog-native.mjs
```

The runner reads [the preserved feature source](pr-478-dialog-feature.txt), uses
only `.test-work/vaults/excalidraw-auto-test/`, and selects a fresh report
directory. It does not contribute extra canonical full-matrix cases. Record any
failure; do not use a focused pass to relabel full native acceptance.

## Remaining environments

Highest-risk follow-up: complex saved Mermaid source/configuration and labels
across main/popout preview, editing, cancel/retry, export and save/reopen.
Physical Android/iOS touch, native macOS/Linux, isolated whole-app cold startup
and complex historical diagram corpora remain separate validation. Desktop
emulation is not physical-device evidence; no absolute zero-regression claim.
