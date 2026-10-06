# Validation record and upstream-merge playbook

This document distinguishes **performed checks** from **required future gates**. It records the initial documentation/checker audit and the subsequent local CLI smoke; it is not a component release sign-off. Gate IDs below are referenced throughout the [catalog](customizations.md) and [retirement backlog](decustomization.md).

## Initial review: what was checked

Review date: 2026-09-29. Inputs and exact archive hashes are in [file-inventory.json](file-inventory.json). The audit read `AGENTS.md` and `CONTRIBUTING.md` in all three supplied repositories, with the fork/plugin policies governing integration and compatibility. Source/consumer review included the fork's `CLAUDE.md`, package/build configuration, plugin runtime/adapters, mount/migration and scripting consumers, and the full path-level upstream-to-fork delta.

The source inventory accounts for **all 230 differing paths**, including 163 modified, 28 fork-only, and 39 upstream-only paths, in 37 stable groups. It includes tests, styles, declarations, lockfiles, empty and non-UTF-8 files; fingerprint searching was supplementary rather than the selection method. The audit records snapshot absences without assigning deletion intent. Git history was unavailable in the original ZIP review. The local checkout now verifies both recorded commit IDs and confirms that the upstream snapshot commit is the fork's merge base; the checker passes against that commit and the maintained fork working tree with both complete-tree fingerprints matching.

The handoff validation uses the commands below to check the inventory against both the extracted upstream directory and original upstream ZIP, run the dependency-free checker tests, regenerate the Markdown ledger deterministically, resolve repository-relative documentation links/explicit inventory anchors, verify the original ZIP checksums, and compare returned files against the original fork. The patch contains only the two root policy edits and the new inventory directory; runtime, dependencies, versions, and plugin sources remain byte-for-byte unchanged. The exact result/count of checker tests is recorded in the handoff summary below.

A small Node probe also confirmed that the added `Object.values(WeakMap)` cleanup pattern does not enumerate/delete weak entries (D02). That is a JavaScript behavior check, not execution of Excalidraw's lifecycle suite.

### Not executed

The extracted repositories have no installed `node_modules`, and a usable Yarn command was not available in the audit environment. No dependencies were installed. The audit **did not execute** the component typecheck, lint/format command, Vitest suites, ESM/type/IIFE builds, tarball consumer tests, plugin build/dev commands, browser rendering, Obsidian main-window/popout workflows, offline checks, physical mobile tests, or performance measurements. It did not measure a new plugin `dist/main.js` size or inspect generated/published package output.

Existing tests were read as assertions of intended behavior, not presented as passing results. In particular, F04 must be resolved/characterized before trusting the component test lane, and F02 requires clean package output before release. These limitations do not obscure the scope of this patch: no production behavior is being changed or claimed regression-free.

### Subsequent local checkout and CLI verification

The available Git checkout verifies that the ZIP comments identify real fork, upstream, and plugin commits. Upstream commit `5a406e51875157bece389b9bc92d41ff241d5f3d` is the merge base of fork commit `c36b852a0acacf556277f71e850f22462a4454a6`. Comparing the maintained fork working tree with that **pinned** upstream commit passes: 230 differing paths and both full-tree fingerprints match `file-inventory.json`. At this review, the local `upstream/master` ref pointed to September 10; using it yielded 304 differing paths and 134 apparent drift findings against the working tree, or 137 findings against committed `HEAD`. Those findings describe a different comparison, so none was copied into the ledger. Git history identifies the examples and documentation-lockfile removals described in OBS-035 and D17.

The dependency-free checker suite now passes 15 tests, including the local Git-ref reader. The plugin's four offline host-runner tests pass. The exact local fork artifact was built and handed to the plugin build, then deployed to the dedicated `excalidraw-test` vault. With Obsidian 1.14.2 (installer 1.14.0), the native smoke passed plugin load, command registration, main-window drawing/API/owner-document assertions, and captured-error checks. It removed its unique drawing and test controller successfully. The built and installed plugin artifact hashes matched; `dist/main.js` was 4,989,625 bytes, SHA-256 `c0010dcadab913fce7b7e288392250408f18db7df0b4101599607d100a0463ee`. The first host run exposed an early command-registration check in the harness; polling that asynchronous registration fixed the false failure. This smoke does not close the feature-specific V03–V11 or physical-device gates.

## Reproduce the inventory checks

### PR #458 checkpoint (2026-10-06)

The [merge review](pr-458-merge-review.md) records the exact parents, migrated unlocked-hit customization, retained `setSelection`, equivalent crop/resize extraction, auto-merge review, and remaining gates. The current comparison uses incoming upstream `53973c3a423fbd75a4ce68107786b4fcb90e4968`: **232 differing paths** and both complete-tree fingerprints match; 15 checker tests pass. Original September counts and archive evidence above remain historical.

The Obsidian artifact/declaration and plugin production builds passed. Four new mounted-editor public-API selection regressions pass in ordinary Vitest; two fail when the incoming selection module is used without the fork override. Exact-build Obsidian 1.14.4 smoke and affected main/popout input, crop, anchoring, embed-magnification, and teardown probes passed with clean error buffers and verified final cleanup. Plugin `main.js` is 4,994,944 bytes. Standard `window.h`-dependent selection/crop/duplicate suites fail at collection, and the repo-wide typecheck fails in the existing generated/test graph; package declarations and a focused source-graph typecheck rooted at the new regression file pass. Physical mobile and the manual cases in the review remain open.

From the fork monorepo root, with Python 3.10+:

```bash
python dev-docs/Obsidian/test_audit.py
python dev-docs/Obsidian/audit.py --upstream-ref 53973c3a423fbd75a4ce68107786b4fcb90e4968
python dev-docs/Obsidian/audit.py --upstream /absolute/path/to/upstream-root
python dev-docs/Obsidian/audit.py --upstream /absolute/path/to/excalidraw-upstream-master.zip
python dev-docs/Obsidian/audit.py --render > /tmp/obsidian-file-inventory.md
cmp dev-docs/Obsidian/file-inventory.md /tmp/obsidian-file-inventory.md
```

Use the **patched** fork tree: comparing the original fork ZIP to this handoff's ledger intentionally detects changes to `AGENTS.md` and `CONTRIBUTING.md`. The inventory self-exclusion and Git-versus-extraction file selection are documented in [README.md](README.md). Binary/raw-byte comparison is intentional. A pass means every observed differing path and complete selected source-tree fingerprint matches a human-reviewed record; it does not establish correctness of the prose, API equivalence, or runtime behavior.

Refresh hashes only after reviewing new/changed/retired behavior. `--report` writes a new observed-only report, never overwrites the ledger, and does not manufacture ownership or retirement decisions. A checksum update alone cannot close a decustomization item.

## Existing regression evidence to preserve

The following tests exist in the supplied fork. Each needs actual execution when its behavior is changed; some exercise unchanged upstream infrastructure as well as the added assertions.

| Test source | Relevant assertions/coverage intent |
| --- | --- |
| [commonObsidianHost.test.ts](../../packages/common/src/commonObsidianHost.test.ts) | Standalone/default behavior, capability forwarding, live settings, protocol mismatch, disposal and stale registration protection. |
| [obsidianExcalidrawHost.test.ts](../../packages/excalidraw/obsidianExcalidrawHost.test.ts) | Structural fake host, service forwarding/errors, settings, pen/touch policy and registration lifecycle. |
| [obsidianText.test.ts](../../packages/excalidraw/obsidianText.test.ts) and [textWysiwyg.test.tsx](../../packages/excalidraw/wysiwyg/textWysiwyg.test.tsx) | Raw-before-edit and independently parsed display/link on submit, including integration with text editing. |
| [clipboard.test.tsx](../../packages/excalidraw/tests/clipboard.test.tsx) | File-aware paste interception and raw text on pasted lines. |
| [actionToggleFrameRole.test.ts](../../packages/excalidraw/actions/actionToggleFrameRole.test.ts) | Marker conversion releases members; undo restores prior membership. |
| [ObsidianRadixPortal.test.tsx](../../packages/excalidraw/components/ObsidianRadixPortal.test.tsx) | Owner-document portal location, host theme resynchronization and mounted-hidden behavior. |
| [crossDocument.test.tsx](../../packages/excalidraw/tests/crossDocument.test.tsx) | Owning-document integration, added top-pick drag/tooltip coverage and currently pending image readiness. |
| [common/utils.test.ts](../../packages/common/src/utils.test.ts), [animation.test.ts](../../packages/excalidraw/tests/animation.test.ts), [renderer/helpers.test.ts](../../packages/excalidraw/renderer/helpers.test.ts) | Supplied-window RAF/cancellation, independent-window animation/timer work, and container-owning-window selection-style lookup/fallback. |
| [colorTargets.test.ts](../../packages/excalidraw/tests/colorTargets.test.ts) | Host regular palettes versus upstream sticky-specific color choices and mixed selection. |
| [FontPicker.test.tsx](../../packages/excalidraw/components/FontPicker/FontPicker.test.tsx) and [fontTopPicks.test.ts](../../packages/excalidraw/tests/fontTopPicks.test.ts) | Fourth top pick and custom/local font selection expectations. |
| [DropdownMenu.test.tsx](../../packages/excalidraw/components/dropdownMenu/DropdownMenu.test.tsx) | Updated accessible-selector expectations accompanying title/label changes. |

These are not comprehensive coverage of the 37 groups. Important missing/insufficiently established gates include SVG frame-width validity, custom stroke canvas/SVG parity, old vault round trips, actual package declaration resolution, platform-specific library saving, complete document isolation, real migration/teardown under pending work, and accessibility after host style changes.

## Required gates for future behavior changes

| Gate | Scope | Minimum evidence before retirement/merge sign-off |
| --- | --- | --- |
| **V01** | Packaging and delivery | Build normal ESM and types plus both Obsidian environments. Inspect the four required runtime artifacts, lexical React/ReactDOM/JSX boundaries, absence of runtime chunks/eager Mermaid/remote required fonts, required font payloads and deliberate CJK path. Validate every manifest type/export target in a clean packed consumer outside workspace hoisting. Verify offline cold load; record plugin production size and compare with an explicit baseline. |
| **V02** | Host/API/type/unit | Run source typecheck and affected test/lint lanes. Structural fake hosts only in boundary tests: defaults, required errors, forwarding, live setting changes, version mismatch, repeated/stale disposal. Compile plugin API/pen-type consumers. Snapshot public additions and test wrappers rather than deleting from no-call searches. Characterize F04. |
| **V03** | Main window, popout, migration | Mount simultaneous editors in distinct documents; move/recreate with a stable owner document; use differing DPI/theme/window state. Preserve scene, selection, viewport, files and host state, with synchronous old-root unmount before asynchronous work. Close either editor without breaking the other. Assert owner-realm DOM/constructors/RAF/timers and main-window storage ownership. |
| **V04** | Text, links, clipboard/drop | Edit raw Markdown, displayed/wrapped text, deleted/empty labels, bound text and legacy wrapping. Test link parsing/hover/open/mobile search, suggester attach/close and key blocking. Await drop handlers and cancellation; paste vault files, external images, text, multi-item data and nullable events without duplicate native insertion. |
| **V05** | Pens, colors and numeric widths | Exercise each custom pen, pressure/no-pressure input, caps/tapers/easing, outline/highlighter layering, preset reset, arbitrary script width, host palettes, sticky/mixed selections and independent bound-text ink. Preserve old serialized stroke settings. |
| **V06** | Fonts, embeds, files, Mermaid | Local Font ID 4 register/replace/load/measure/export, empty-scene font load, Assistant and CJK behavior, lazy host converter with errors/retry, diagram source metadata, vault/media/PDF embeds and desktop/mobile fallbacks. For SVG bypass, compare certified input with ordinary/untrusted input; normal normalization must remain the default. |
| **V07** | UI, accessibility, theme | Main/popout desktop, phone/tablet and physical mobile, tray/full/mobile modes, zero-width startup, settings changes, welcome/help, library save/cancel, keyboard/focus and screen-reader labels. Check both themes, RTL, host CSS isolation, popover/tooltip ownership and duplicate editor roots. |
| **V08** | Saved scenes, frames and geometry | Restore/edit/duplicate/save/reopen legacy and current drawings, short IDs/links, raw text, deleted/group members and orphan repair. Test marker/ordinary/magic frame creation, naming, membership, role change and undo. Check anchoring, embed magnification, scripted selection/z-order, line editing, bound text and arrow refresh. |
| **V09** | Input and interactive canvas | Grid size/direction/colors, selection/link contrast, search highlighting, transient overlays, touch/pen crosshair and double tap, right-button/single-finger pan, `M` path, zoom bounds/step/fit and pointer notification ordering. Do not infer real-device gestures from desktop emulation alone. |
| **V10** | Export fidelity | Compare PNG/canvas/SVG output for highlighters, custom stroke outlines, fonts, links, frames/colors/names, anchored/scaled embeds, bitmap/SVG dark-mode inversion and shared-file inversion variants. Assert marker exclusion from exported content and embedded scene data. Validate numeric SVG attributes and host canvas limits on large images. |
| **V11** | Async teardown and shared caches | Repeated mount/unmount and main/popout migration while images, fonts, Mermaid, animation, tooltips and drags are pending. Verify cancellation/stale callback guards, idempotent disposal, absence of cross-editor cache/timer interference, pending-image all-settled semantics and no hidden paint guarantee. |

## Commands for component/plugin checkpoints

These commands are **instructions for the normal development environment, not a record of execution here**. Use Node 22+ and Yarn in this fork; use npm in the plugin. Verify the toolchain before diagnosing source failures. `build:obsidian` is a **package-local** script, so the root invocation needs `--cwd`.

```bash
# Fork monorepo root; dependencies already provisioned with its Yarn lockfile.
node --version
yarn --version
yarn --cwd packages/excalidraw build:obsidian
yarn test:typecheck
yarn test:app --run packages/common/src/commonObsidianHost.test.ts \
  packages/excalidraw/obsidianExcalidrawHost.test.ts \
  packages/excalidraw/obsidianText.test.ts

# Add each touched subsystem's tests from the table, then ordinary repo checks.
yarn test:code
yarn test:other
yarn test:app --run

# Required when verifying packaging, including the normal ESM/declaration lane.
yarn --cwd packages/excalidraw prepack
# Inspect pack contents without re-running lifecycle scripts or publishing.
(cd packages/excalidraw && npm pack --ignore-scripts --dry-run)
```

The pack listing is not enough: test an actual locally packed tarball in an isolated ESM/TypeScript consumer and inspect runtime/type resolution. Never publish, bump a version, run auth hooks, or update the plugin dependency merely to finish an inventory review. If a baseline command fails, preserve its diagnostics, distinguish touched-file failures from unrelated baseline failures, and report the narrow checks that did run.

For an unpublished integration checkpoint, copy only the four locally built runtime artifacts into the plugin's ignored `node_modules/@zsviczian/excalidraw/dist/obsidian/` directory without changing its dependency declaration, then run `npm run build` in the plugin and `npm run dev` when development payload/CSS changed. Record the production bundle byte size. Exercise applicable V03–V11 workflows in Obsidian; a plugin build alone is not runtime sign-off. A durable plugin release that consumes new APIs separately needs the matching published package and exact dependency/lockfile update under maintainer control.

<a id="merge-playbook"></a>
## Merge playbook

1. **Establish real inputs.** In both repositories record branch, clean/dirty status, source commits and the actual upstream merge base. Preserve local work. Use complete source checkouts/archives, not the text-focused repository exporter. Read root policies, relevant catalog entries and plugin contracts before resolving conflicts.
2. **Review both clean and conflicted deltas.** Use the ledger as a checklist, not only Git conflict markers or `zsviczian` matches. For each behavior record old owner, upstream replacement/extraction, active plugin consumer and saved/public compatibility. Inspect moved/deleted files and dependencies. Keep unresolved absence/ancestry claims explicit.
3. **Follow upstream ownership.** Start from upstream's new file/component organization, migrate only necessary hooks and isolated helpers, and leave unrelated code verbatim. Avoid resurrecting an old component wholesale. Keep call order, async cancellation, selection/undo and ownership semantics. Put independent cleanup in its own checkpoint.
4. **Retire with evidence.** Cite equivalent upstream code, completed plugin migration or source-proven inertness. Preserve public aliases/saved readers where necessary. Keep the stable ID with retirement reference and gate results; remove only obsolete active file rows. A matching name, passing merge, or newly absent caller is insufficient.
5. **Validate the combined result.** Compare against both merge parents, including auto-merged customized paths. Run the immediate Obsidian build, relevant tests/typecheck and plugin checkpoint; then applicable real runtime gates. Record skipped/failed checks precisely. Update catalog, contracts, backlog, file mappings/hashes and baseline provenance in the same PR; regenerate and check the ledger.
6. **Handoff without overstating readiness.** Report changed IDs and consumers, retirements with evidence, artifact/package checks, plugin size, runtime platforms exercised and remaining risks. New plugin APIs must follow the published-package handoff policy. Unverified essential gates remain open.

## Risk-based manual handoff

For this documentation-only patch the immediate risk is an inaccurate inventory statement or a coverage checker being mistaken for runtime approval. Review the source links and a representative file in each group, then reproduce the checker tests and source comparison.

For follow-on cleanups, the most likely regressions are hidden public/script dependencies, changed raw-text/legacy scene interpretation, early-state/UI timing, and cross-document async ownership. Main-window, popout, physical iOS/Android, offline assets, old-file round trips and SVG/canvas export require separate evidence; none is waived by this audit.

## Handoff checker result

**Original ZIP handoff recorded:** 14 dependency-free checker tests, including Git file selection, binary/empty/unmarked differences, new/retired/content drift, archive handling, classification validation, and exclusive report creation without manifest mutation. Both upstream-directory and upstream-ZIP comparisons passed with 230 reviewed differences and matching complete-tree fingerprints. The Markdown ledger reproduced byte-for-byte; all 759 repository-relative documentation links/anchors and explicit plugin source paths resolved. All three original ZIP checksums/comments matched the recorded provenance. The handoff archive contained exactly 11 added/modified files, with no deletions or other source changes; its member paths, content bytes and ZIP integrity were checked. The subsequent local Git and native smoke results are recorded above; neither the original audit nor the basic smoke closes feature-specific runtime gates.
