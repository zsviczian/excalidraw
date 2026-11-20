# Runtime compaction checkpoint — 2026-11-20

Branches: `perf/compact-obsidian-artifact` from fork `0a93447eb`, paired with
plugin `perf/compact-plugin-runtime` from `73b631ab`. The upstream comparison
remains `2c3dcc06ec807e81ab9437eceb1a8f7a3c590743`. This is packaging work,
not an upstream merge or a public API/protocol/version change.

The production Obsidian IIFE compresses the exact generated HarfBuzz and WOFF2
WASM binaries before Base64 encoding, inflating them with the existing Pako
dependency. The two original Uint8Arrays are restored byte-for-byte. The
development and ordinary ESM builds retain their original representation.
The build rejects unexpected generated-module syntax or invalid WASM.

After the existing empty/English-equivalent translation pruning, all 56
non-English locales share one path dictionary. Each module retains its default
object and named top-level JSON exports, including unusual string export names.
English and language percentages are untouched. No language or translated
value is removed by this checkpoint. Input namespace support is enabled only
for production bundling; the IIFE output remains ES2020.

The paired plugin reuses existing published `Fonts` descriptors instead of a
second 209-entry Xiaolai table. `P: src/utils/CJKLoader.ts` and
`P: src/core/managers/FontManager.ts` preserve settings, range selection,
vault loading and owner-document registration. No new component API is needed.
Its private Chroma build entry retains every installed input parser and the
validation/alpha/hex operations actually used by SVG and Lucide conversion.
Public ColorMaster behavior is unaffected.

Sequential production main.js measurements (bytes):

| Checkpoint | Size | Saving from previous |
| --- | ---: | ---: |
| Baseline | 5,218,572 | — |
| CJK reuse | 5,108,897 | 109,675 |
| Narrow private Chroma | 5,090,334 | 18,563 |
| Exact WASM compression | 4,881,274 | 209,060 |
| Shared locale keys | 4,841,250 | 40,024 |

Total saving: 377,322 bytes. The locale saving is smaller than the exploratory
default-only prototype because preserving named JSON exports is required.
Unchanged development JS and both CSS hashes establish production-only scope.

Five packaging tests execute both real WASM modules, compare every packed
locale namespace/default to real esbuild JSON output, and cover unusual keys,
empty objects, arrays and determinism. The real-artifact browser suite passes
34 cases across production/development, including first/warm subset export and
browser FontFace decoding. Plugin tests cover all seven former CJK selections
and 1,670 Chroma inputs. Native main/popout CJK raster comparisons and real WASM
font export pass; initial lazy-registration wait and diagnostic-array reporting
failures remain in the plugin's ignored implementation logs. Complete
coordinated acceptance passes all 1,637 canonical cases (1,161 portable, 316
native core and 160 device cases), with strict errors, cleanup, restoration and
required identities complete. Production/development/library builds, full/owned
types and package consumers pass. See [exact evidence](runtime-compaction-results.json).

Highest-probability regressions: missing CJK subsets after settings/reload,
locale namespace/fallback mismatch, or first-use font export inflation. Exercise
local CJK offline in main/popout, switch languages, export SVG/PDF with text,
and reopen the result. Windows native and desktop device emulation do not
establish physical mobile, macOS/Linux or whole-application restart behavior.
The maintainer confirmed the solution works on Obsidian mobile (OS/device
unspecified) and authorized commits, PRs and merges in both repositories.
Package publication, dependency changes and version upgrades remain separate.
