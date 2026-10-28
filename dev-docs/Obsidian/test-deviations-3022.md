# Individual upstream diagnostic review for #3022 / #477

The maintainer accepts current fork behavior by default. Each of the 380 failed
assertions at fork d04bc1a6211a15394a1cc7036e7a7532608bf421 has its own entry in the
[case index](test-deviations-3022.json): source/test location, exact failing
assertion, observation, assessment, reasoning and independent evidence.

This is a retrospective review of the old diagnostic, not an expected-failure
allowlist. No entry changes the independent suite's execution or success. No
product fix or snapshot update was made to agree with an obsolete assertion.
A checkpoint that fails before a workflow completes cannot establish that the
remaining assertions in that workflow pass; independent tests protect the
relevant current contracts instead.

| Assessment category | Assertions |
| --- | ---: |
| selector | 69 |
| snapshot | 22 |
| test-tag | 2 |
| scheduled-tool | 117 |
| render-count | 139 |
| bootstrap | 10 |
| host-service | 6 |
| selection-policy | 2 |
| image-order | 6 |
| pan-hook | 5 |
| host-link | 2 |

The ten sidebar bootstrap failures never reach their docking assertions. The
library search/menu mismatches were checked with trusted input against both
built artifacts: search clears on Escape, the sidebar remains open, and the load
control is visible through its portal. The five pan-hook cases conflict with the
explicit fork change that sends pointer-down before pan ownership; independent
source tests preserve that host hook. The two text/link cases use a diagnostic
host that disables link synchronization while asserting that it is enabled.
Mermaid diagnostic cases omit the real host service; the independent/native
lanes exercise Extras and the editable scene contract.

Renderer call counts, full DOM/app-state snapshots and a nonenumerable test-only
clone tag are not product contracts. Stable public relationships, serialized
host text/links/metadata, decoded output, trusted input and persistence are the
regression oracles. Asynchronous tool activation is deliberate and is awaited
through public state, without forcing timers synchronous.

The development-mode native dirty-migration residual is recorded separately in
the plugin's docs/TESTING_FINDINGS_3022.md. Production native/device checks pass
after a private-React scheduler correction, with no exception filtering. The
independent suite does not claim that every historical test or platform workflow
is covered.
