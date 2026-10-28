# Automated test coverage: fork owner

Prepared by **Zsolt's Codex Agent**, 2026-10-28, at the maintainer's request.

**Temporary design-only handoff. No test repair or production change is included.** The draft PR attached to this branch contains the detailed design, upstream-baseline recovery procedure, feature matrix and acceptance criteria. Read its full description and the companion plugin/Extras PRs. Continue on this branch rather than creating a competing PR.

## Baselines

- Branch: `2026-10-28-automated-test-coverage`, targeting `master`.
- Fork: `9ede0da2581387b0bc12ef184a093a9274be9bb7`.
- Documented upstream comparison: `14bb42edee3d6fee6be264e3ee78670b3b9cee79`; verify actual ancestry and update the comparison deliberately when resuming.
- Plugin: `962416bbd379b9c8aabf2a892940ef3abbf11185`.
- Extras: `f82fe17c11f76f63163bfb5b2df430cbacd051d6`.
- Companion branches use the same branch name in both other repositories.

Read `AGENTS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, and `dev-docs/Obsidian/README.md`, `contracts.md`, `customizations.md`, `validation.md` and `decustomization.md`. Verify remote heads and current accepted contracts before coding. Preserve upstream mergeability and the stable OBS customization IDs.

## Ownership and first checkpoint

Own an isolated fork test/config/setup directory, a separate compatibility lane that executes inherited upstream tests, real-browser/package tests, and exact artifact/declaration manifests for plugin integration. The plugin owns native Obsidian orchestration and the canonical portable vault. Extras owns its services and privilege tests.

First reproduce and classify the complete current test/typecheck baseline. Historical validation records are evidence of prior runs, not fresh results. Inherited configuration matched the documented upstream configuration byte-for-byte during investigation. Prefer additive configuration/setup overlays and public APIs; never blanket-edit upstream tests, replace snapshots to hide failures, enable production `window.h` hooks, or call a small isolated passing suite a repaired upstream baseline.

Map every active runtime OBS group and important upstream behavior affected by the fork to executable tests. Keep independent tests independent of a local Obsidian installation. Publish the four Obsidian artifact hashes and generated declaration evidence through the shared test manifest, without publishing a package or changing dependency versions.

Native Obsidian use must go through the shared cross-repository host lock and plugin coordinator, even when the three repository agents work in parallel. Do not stage over another agent's build or silently substitute installed published artifacts.

## Completion discipline

Run the required repository gates honestly. Review and restore unrelated output from the required snapshot-update diagnostic; it is not approval to refresh failing expectations. Update the fork inventory for implementation changes in the same patch. This handoff is inside the inventory's self-excluded documentation directory and does not change a runtime fingerprint.

Before final handoff, preserve durable testing instructions in maintained documentation, remove this temporary file, update the PR with actual validation and unresolved limitations, and leave it draft for maintainer review. No build, suite, inventory checker or native runtime test was executed during this design preparation. No merge, release, version bump or unrelated decustomization is authorized by this handoff.
