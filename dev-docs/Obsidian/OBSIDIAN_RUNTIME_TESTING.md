# Testing the fork inside Obsidian

This is the native validation lane for the `@zsviczian/excalidraw` fork and its consuming Obsidian plugin. The [source inventory](README.md), source tests, type checks, and builds answer different questions. A successful CLI smoke proves that one exact local build loaded and rendered a newly created drawing in a desktop test vault; it does not prove every `OBS-xxx` behavior or physical-device compatibility.

## Test vault and prerequisites

Use the dedicated `excalidraw-test` vault, including its `TestAssets` fonts, PNG, and SVG for later feature probes. Keep personal vaults out of this lane. The vault must already be opened in a running Obsidian desktop installation with **Settings → General → Command line interface** enabled and community plugins allowed. Focus its main application window before the smoke; the runner requires the new drawing to mount there. Ensure the plugin's drawing-template setting does not resolve to an active template that opens a chooser. Obsidian's [CLI reference](https://obsidian.md/help/cli) documents explicit `vault=<name>` targeting, `plugin:enable`, `eval`, and the developer commands. Inspect `obsidian help` on the installed version before relying on a command; the CLI needs a running app.

Set the three paths explicitly. The runner accepts only the vault named `excalidraw-test`, checks the real CLI-reported vault path before touching it, and rejects symlinked plugin targets. Its config directory must be inside that vault and contain `community-plugins.json`.

```bash
export EXCALIDRAW_TEST_VAULT_NAME=excalidraw-test
export EXCALIDRAW_TEST_VAULT_PATH=/absolute/path/to/excalidraw-test
export EXCALIDRAW_TEST_CONFIG_DIR=/absolute/path/to/excalidraw-test/.obsidian
cd /absolute/path/to/obsidian-excalidraw-plugin
npm run test:obsidian:runner
npm run verify:obsidian
```

The plugin and fork repositories need their normal installed dependencies. The runner assumes the fork is the sibling `../excalidraw`; set `EXCALIDRAW_FORK_ROOT` to its absolute path when needed. `EXCALIDRAW_OBSIDIAN_CLI` selects a nonstandard CLI binary. `EXCALIDRAW_TEST_REPORT_DIR` selects an existing or new report directory; otherwise the runner prints a temporary directory. No command in this lane changes the plugin dependency or lockfile, publishes a package, or updates the fork inventory.

## What the strict smoke does

`npm run verify:obsidian` runs the plugin's [`scripts/testing/host/verify.mjs`](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/scripts/testing/host/verify.mjs) in the sibling checkout. It:

1. Verifies the named vault/configuration and checks that the CLI targets its real path. Missing CLI, wrong vault, or missing commands fail before build or deployment.
2. Runs `yarn build:obsidian` in the local fork. It copies only the four generated Obsidian JavaScript/CSS artifacts into the plugin's ignored installed `@zsviczian/excalidraw` package, verifies their SHA-256 hashes, then runs the plugin's production `npm run build`.
3. Checks the built plugin manifest ID, disables an existing test-vault installation, copies `main.js`, `manifest.json`, and `styles.css` from the exact build, verifies installed hashes, and enables the plugin. Existing plugin `data.json` is preserved.
4. Asserts the live plugin instance and drawing command are registered. It creates a uniquely named temporary drawing through the installed plugin, waits for an Excalidraw view with an API and `.excalidraw-wrapper`, checks the view's owning document, and rejects captured JavaScript errors.
5. Closes and deletes only that uniquely named drawing, removes its temporary eval controller, and writes `report.json` with source revisions/dirty flags, artifact hashes, scenarios, cleanup result, and failure phase. Cleanup failure fails the run.

The CLI's `eval` output is parsed as JSON after its `=>` display prefix is removed; an `Error:` response is treated as failure even when the process exits zero. Every CLI call explicitly prefixes `vault=excalidraw-test`. The runner uses `app.plugins.plugins["obsidian-excalidraw-plugin"]` only inside test-only CLI expressions to inspect the installed plugin; production code must continue to use the typed host adapters. Reacquire plugin/view references after reload or emulation. The CLI executes the installed `main.js`, never working-tree TypeScript.

If the CLI reports that Obsidian is missing while the app is visibly running, check whether the command environment can access the user's `~/.obsidian-cli.sock`. In this workspace, a sandboxed CLI call could not reach that socket; the same read-only command succeeded with host access. Do not launch a second app or infer that the vault is absent from that error alone.

The deployment changes only the named test vault's plugin installation and creates/deletes a temporary drawing. It does **not** restore a previous test-vault plugin build. Do not point it at a personal vault. The generated report is local evidence; review it before sharing because it contains local paths.

## Feature probes after the smoke

Choose the relevant [V03–V11 gates](validation.md#required-gates-for-future-behavior-changes) and `OBS-xxx` catalog entries for each fork change. The basic runner covers one main-window blank drawing. Add bounded scenarios to the runner, or capture reproducible CLI evidence for the affected workflow, before calling a change runtime-validated. A source test or build alone does not replace these checks.

Useful read-only probes, always against the named vault:

```bash
obsidian vault=excalidraw-test eval 'code=JSON.stringify({loaded:!!app.plugins?.plugins?.["obsidian-excalidraw-plugin"],views:app.workspace.getLeavesOfType("excalidraw").length})'
obsidian vault=excalidraw-test dev:dom 'selector=.excalidraw-wrapper' total
obsidian vault=excalidraw-test dev:errors
```

For text and clipboard changes, test raw Markdown display/edit/submit, links, file paste, image paste, and cancellation with a drawing in the test vault. For fonts and embeds, use `TestAssets` and verify font registration/replacement, PNG/SVG insertion, export, and offline behavior. For window/portal changes, open the same drawing in main and popout windows, then close/migrate one view and verify the other; inspect owning document, menu visibility, stacking, and errors. Do not infer popout or mobile correctness from a single main-window smoke. CLI mobile emulation and viewport changes can establish layout/routing, but native touch, keyboard, and WebView behavior need physical-device evidence.

Record the source revision and dirty state, artifact hashes, installed Obsidian version, exact fixture/settings, scenario steps, observed output, cleanup, and any unavailable gate. Use short serializable eval probes and inspect prerequisites after each CLI call. Treat a CLI `Error:` line, timeout, missing host, or an unavailable essential scenario as a failed or pending check, never as a pass. Remove temporary controllers or instrumentation after a diagnostic run, including from the final bundled `dist/main.js`.
