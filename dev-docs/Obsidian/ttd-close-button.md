# TTD close button — 2026-10-31

Both Mermaid and text-to-diagram now request the shared Dialog close button on
desktop. `showCloseButton` is opt-in, so other desktop dialogs retain their
existing policy. Phones still render exactly one button. The standard close
icon, translated accessible name, positioning, focus cleanup and dismissal
handler are reused; no new CSS or alternate close handler is introduced.

Fork-owned source cases cover both tabs and the fallback Mermaid dialog,
close/reopen/Escape, no submission and scene preservation. A negative-control
run restored the original fullscreen-only condition and failed the desktop
close-button assertion as expected. JSDOM supplies its missing
`scrollIntoView` API locally and restores the original descriptor after each
case. Real scrolling/layout is checked in Chromium, rather than inferred from
this stub.

The built production/development browser suite checks both tabs at 1200, 768
and 390 pixels, measuring settled modal geometry after its opening animation.
Each has one accessible button at the top right, clear of the tabs and inside
the dialog. Trusted clicks close without changing scene state. Trusted Enter
and Escape also dismiss. Width 390 records actual phone/fullscreen mode;
desktop mobile emulation is not physical-device touch evidence.

The maintained real-Extras native probe also checks close behavior in both
tabs in main/popout windows, retaining light/dark preview pixel comparisons,
editable source, export, save/reopen and cleanup checks. Native DOM `.click()`
is explicitly synthetic; trusted interaction evidence belongs to the separate
built-browser suite.

Repeat from the fork checkout:

```powershell
yarn.cmd vitest run --config vitest.obsidian.config.mts tests/obsidian/unit/ttdCloseButton.test.tsx
yarn.cmd test:obsidian:coverage
yarn.cmd test:obsidian:types
yarn.cmd --cwd packages/excalidraw build:obsidian
yarn.cmd test:obsidian:browser
python dev-docs/Obsidian/test_audit.py
python dev-docs/Obsidian/audit.py --upstream-ref a758e93d6a03e9f995973703cb886850a398a6d3
```

The native command remains the guarded [dialog runner](pr-478-dialog-runner.txt),
copied to `tmp/ttd-close-native.mjs` in the sibling plugin checkout and executed
with Node. It rebuilds/deploys/hash-checks current workspace fork/plugin/Extras,
uses the application-session lock and the repository-local
`.test-work/vaults/excalidraw-auto-test/`, then restores its baseline. See
[the previous preview validation](mermaid-preview-background.md) for setup.

## Validation results

**139 source cases, 20 built-browser cases and 61 native assertions pass.**
Full/owned typechecks, focused zero-warning lint, both fork builds, plugin/Extras
builds, packed-consumer verification, 15 audit tests and the 267-path inventory
comparison pass. The browser and native checks used matching four-artifact
runtime hashes. Exact revisions, dirty-source fingerprints, artifact hashes,
case results and empty diagnostic/error lists are in
[the sanitized results](ttd-close-button-results.json).

The first native attempt failed at `popout light close preserves scene` and
did not record its immediate scene/state. A diagnostic replay on unchanged
production code passed all 59 then-current checks. Review identified a setup
gap: the probe opened a second view before explicitly persisting its generated
fixture. It now requires an acknowledged save and the matching persisted
popout scene before exercising close. All original close assertions remain;
the final run passes 61 checks, cleanup and baseline restoration. The failed
attempt is retained in the evidence; its exact immediate cause was not captured
and is not asserted to be proven by the replay.

The tested build is deployed to the authorized live vault. Its settings files
are byte-preserved; all 212 plugin and four Extras in-memory settings and the
enabled-plugin configuration are preserved. Both plugins are ready. The plugin
bundle is 5,031,239 bytes, 211,641 bytes below the 5 MiB target. Validation used
the working-tree fork patch together with the preceding preview-background
fix; plugin and Extras source are unchanged.

Manual check: open either tab and select **Close** in the main window and a
popout; reopen and press Escape. Narrow/phone layout should retain one button
without covering a tab. Physical mobile and other desktop operating systems
need separate validation. This focused change does not establish a new full
357-case native acceptance pass. No version, dependency, PDF or observer change.
