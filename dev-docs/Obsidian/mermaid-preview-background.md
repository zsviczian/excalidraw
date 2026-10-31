# Mermaid preview background — 2026-10-31

Obsidian can override `--default-bg-color`, leaving a gray preview panel around
a white Mermaid image. `TTDDialog/common.ts` now uses the exported canvas's
white background and the renderer's existing dark-mode filter. Neither host
theme variables nor diagram/export behavior changes. The original upstream
assignments remain commented and fingerprinted; OBS-030 owns this difference.

Two new fork-owned unit cases failed before the fix and pass after it. They
cover light/dark colors, the export theme, error propagation and reset. JSDOM
does not establish rendered colors: the real native probe separately overrides
the variable to `#595850` and compares computed panel colors with opaque canvas
corner pixels. Both main and popout pass in light (`255,255,255,255`) and dark
(`18,18,18,255`) modes, with selected source, export, save/reopen and cleanup
checks retained. Theme changes are restored after the probe.

Validation: **136 source cases, 18 production/development browser cases and 49
real-Extras native assertions pass**. Full and owned typechecks, focused lint,
both fork builds, plugin/Extras builds, 15 audit tests and the 265-path inventory
comparison pass. The packed-consumer check passes when invoked directly with
Node; invoking it through Yarn sets `npm_execpath` to Yarn and fails before
consumer validation because that helper expects npm's pack result. Sanitized
case results and exact build identities/hashes are
in [the results](mermaid-preview-background-results.json). The fork build is
`d22f8ec1758a79fea6e106c9d1a80bf589d34f27` plus this uncommitted patch; plugin
`ed99e793168a601a6151969ec80ce7232d9af5b0` and Extras
`df1f2b5659259c43780c5ef07cd433fa6c3e14fa` are unchanged.

Repeat from the fork checkout (Node 22+, Windows command names shown):

```powershell
yarn.cmd vitest run --config vitest.obsidian.config.mts tests/obsidian/unit/mermaidPreviewBackground.test.ts
yarn.cmd test:obsidian:coverage
yarn.cmd test:obsidian:types
yarn.cmd test:typecheck
yarn.cmd --cwd packages/excalidraw build:esm
yarn.cmd --cwd packages/excalidraw build:obsidian
yarn.cmd test:obsidian:browser
node tests/obsidian/packageConsumer.mjs
python dev-docs/Obsidian/test_audit.py
python dev-docs/Obsidian/audit.py --upstream-ref a758e93d6a03e9f995973703cb886850a398a6d3
```

The native probe uses the plugin's application-session lock and prepared
`.test-work/vaults/excalidraw-auto-test/` exclusively, rebuilding/deploying and
hash-verifying all three workspace components. From the plugin checkout:

```powershell
Copy-Item ../excalidraw/dev-docs/Obsidian/pr-478-dialog-runner.txt tmp/mermaid-background-native.mjs
node tmp/mermaid-background-native.mjs
```

The maintained runner reads `pr-478-dialog-feature.txt`, now including the four
pixel/color assertions. Reports use a fresh ignored directory by default. The
test vault's settings/plugins are restored and its installed build remains
available. No production-vault fixtures are created.

The same verified build was deployed to the maintainer-requested live vault.
Plugin `main.js` is 5,031,207 bytes, 211,673 bytes below the 5 MiB target. Both
settings files were byte-preserved; all 212 plugin and four Extras in-memory
settings and the enabled-plugin configuration were preserved. No version,
dependency, protocol, PDF, observer, or Extras production-source change.

This focused check does not establish a new complete native acceptance pass.
Physical mobile and other desktop systems remain untested for this patch.
The most useful manual check is to open a Mermaid pie preview, switch between
light/dark themes, and repeat in a popout; the entire panel should match the
image margin. Physical-mobile layout/touch remains a separate check.
