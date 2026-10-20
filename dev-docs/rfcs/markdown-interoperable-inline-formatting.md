# RFC: Markdown-interoperable inline text formatting

**Status:** Discussion proposal only — no implementation or API commitment  
**Scope:** Excalidraw text elements, editing, rendering, serialization, and integrations  
**Date:** 2026-10-20

## Summary

Introduce a small, explicit inline-formatting vocabulary to Excalidraw text elements, with a familiar WYSIWYG editor and a **lossless, documented Markdown-compatible source representation**. The initial vocabulary is emphasis (bold/italic), strike-through, optional underline, and foreground color. The element still owns one font family, size, line height, and overall layout. Arbitrary HTML, nested blocks, and per-character font changes are out of scope.

This is not a proposal to expose Markdown syntax as the default editing experience or to make Obsidian-specific constructs part of Excalidraw. A user can select text and click Bold or Color. The editor manipulates a structured intermediate representation, and the serializer emits a deliberately constrained source format that Markdown-based applications, CLI tools, and agents can inspect and edit.

**Core compatibility contract:** Existing scenes and callers expecting plain text must continue to work. The proposal must specify exactly which field is authoritative and how edits through either the rich UI or the host's Markdown representation round-trip. Two independently mutable copies of the same text are not acceptable.

## Motivation

Today a text element stores text as strings such as `originalText` (unwrapped) and `text` (display/wrapped). Excalidraw's rendering, wrapping, positioning, fonts, SVG/canvas exports, editing, and saved scenes depend on this contract. A rich-text editor that simply changes `text` into editor-specific serialized JSON would break existing consumers.

Obsidian Excalidraw stores drawing data inside a Markdown file, with a separately editable **Text Elements** section. Its `ExcalidrawData` model explicitly distinguishes `rawText` (unwrapped Markdown source), `originalText` (unwrapped rendered/parsed text depending on mode), and `text` (possibly wrapped/display text). That section can be changed outside the canvas and used to update the scene. A rich format that cannot round-trip to Markdown risks losing Obsidian edits or inline formatting.

A Markdown-compatible source offers additional, *qualified* benefits beyond Obsidian:

- **CLI and LLM workflows:** short, readable text is easy to generate, patch, review, diff, and include in prompts; unlike opaque editor state, the source can be written in ordinary text tools.
- **Interchange:** Markdown-oriented consumers can preserve familiar emphasis and links, while a documented extension covers a small number of properties Markdown lacks.
- **Portability:** content is less tightly coupled to a specific editor framework. No claim is made that markup is the best in-memory editing or rendering representation.
- **Compatibility:** legacy plain-text consumers can still read a predictable plain-text projection.

Markdown itself does **not** solve cursor mapping, layout metrics, security, rich paste, or concurrent editing. These remain explicit implementation responsibilities.

## Proposed behavior and scope

1. **User experience:** Keep canvas text editing simple. Text selection + formatting actions; no mandatory Markdown source view. Formatting applies to a selection; no selection changes the text element's default style. The active editor can use a purpose-built implementation or a library, provided its document model is not persisted as an undocumented opaque blob.
2. **Initial inline marks:** strong, emphasis, strike, optional underline, and foreground color. Bold and italic can combine. Decide whether foreground color permits only palette tokens, normalized CSS colors, or both. Preserve one font family/size/line height per text element for v1.
3. **Inline source subset:** CommonMark-style `**bold**`, `*italic*`, and `~~strike~~` (the latter follows widely used Markdown extensions). Underline and colors use a *strictly specified* limited inline HTML form such as `<u>underlined</u>` and `<span style="color:#e03131">red</span>`. This is **Markdown plus a defined extension**, not pure CommonMark and not arbitrary HTML. Markdown engines differ in whether/how inline HTML renders; downstream consumers need a documented fallback.
4. **Escaping:** literal `*`, `_`, `~`, `<`, `&`, backslashes, and delimiters must remain literal after save→load→save. Nested marks and overlapping editor selections must canonicalize deterministically.
5. **Unsupported input:** preserve the original source where possible and render unsupported markup as literal text or reject it with an explicit, non-destructive fallback. Do not silently strip HTML, embedded scripts, or styles. Only the allowlisted span/color and underline tags are interpreted; never insert source HTML directly into the DOM.
6. **Links:** Maintain existing Excalidraw element link semantics. Treat inline Markdown links as a separate design decision, not an accidental result of a general Markdown parser. Obsidian wikilinks and embeds remain host-specific.
7. **No layout blocks:** headings, tables, lists, arbitrary HTML elements, per-run font family/size, images, code blocks, and embedded DOM are deferred.

## Decision note: should Markdown replace `originalText`? (2026-10-20)

**Recommendation: no, not directly.** The appealing idea is to put markup in `originalText` and leave `text` as the rendered projection. However, upstream currently treats both properties as *plain text*, with different wrapping semantics. Changing `originalText` to source markup is a breaking semantic change, even if its TypeScript type stays `string`.

### Current upstream contract (verified)

- `ExcalidrawTextElement` declares both `text: string` and `originalText: string`. [Element type](https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/types.ts).
- The [WYSIWYG editor](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/wysiwyg/textWysiwyg.tsx) explicitly states it deals with `originalText` and derives wrapped `text` from it.
- The [text geometry helpers](https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/textElement.ts) pass `originalText` directly into `wrapText()` and measure the result. [Auto-resize](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/actions/actionTextAutoResize.ts) also measures `originalText`.
- Text mutations, search, copy/paste, bindings, sticky-note fit, exports, and APIs have further consumers that must be audited before changing semantics.

**Counterexample:** setting `originalText = "Hello **world**"` while `text = "Hello world"` would make existing wrap/measure/edit paths count six markup delimiters as characters, potentially wrap or size incorrectly, and expose visible markup when editing. A plain-text scene remains entirely valid; a new field cannot be mandatory.

### Proposed backward-compatible contract

For **legacy text elements**, retain all existing semantics:

- `originalText`: authoritative unwrapped plain text.
- `text`: derived displayed text, with layout-inserted wraps; ordinary line breaks retained.
- No inline-formatting metadata unless the user opts into rich inline styling.

For **formatted text elements** introduce an optional, versioned field, name illustrative:

```ts
{
  type: "text",
  originalText: "Hello world", // unwrapped, decoded plain text
  text: "Hello\nworld",        // display text, line wrapping for this geometry
  inlineSource: "Hello **world**", // authoritative Markdown-compatible source
  inlineSourceFormat: "excalidraw-inline-md-v1"
}
```

The **authoritative source for formatted elements is `inlineSource`**; `originalText` and `text` remain *derived projections* and keep their existing meaning. Parsing returns plain characters, marks, and source-to-plain offset mapping. Layout derives wrapped text and formatted runs from the same result; synthetic wrap breaks never enter the source.

This preserves older consumers' expectations for plain text while making formatting available to opt-in callers. It does **not** guarantee that old applications can preserve formatting after editing a newly formatted element: the read/write contract must define how updates from legacy `originalText`-only APIs are handled. Prefer an explicit `updateTextContent({ source, format })` path; if an older caller changes plain text only, define whether to discard marks, remap them deterministically, or reject a stale-source update. Never silently persist mutually inconsistent fields.

The earlier **Data model** alternatives in this RFC remain explorations; for an upstream compatibility-first design, **this note supersedes treating `originalText` as markup**. A plain-text + formatting-ranges model is still a candidate: `originalText` remains canonical plain text, and a Markdown codec provides interchange. The critical invariant is that `originalText` itself must not quietly change from plain to markup.

### Obsidian consideration, deliberately deferred

Obsidian Excalidraw already maintains a separate `rawText` in its host data model to retain Markdown source—including links and aliases—while `originalText` and `text` represent parsed/display content. This is evidence for the **need to keep source distinct from plain-text projections**, not a proposal that upstream must adopt Obsidian's specific `rawText` field, link grammar, or synchronization code. A future Obsidian adapter can map upstream `inlineSource` and its own `rawText` with documented precedence and lossless host-link handling. Avoid conflating Obsidian wikilinks with upstream rich-text marks.

### Explicit acceptance criteria

1. For unformatted legacy scenes, serialize/load, wrap, search, edit, measure, export, and text-binding behavior remain unchanged.
2. Formatting `Hello **world**` produces `originalText === "Hello world"` and a plain-text display projection; the glyphs `**` must not contribute to width/height.
3. Every editor mutation atomically updates authoritative formatted source, unwrapped plain text, wrapped display text, and run layout; invalid source cannot silently desynchronize them.
4. Width/height changes only alter layout projections, not `inlineSource` or user-authored line breaks.
5. A plain-text-only API changing `originalText` on a formatted element has a **documented**, tested behavior; no ambiguous last-writer-wins state.
6. Current scene and clipboard consumers degrade to readable plain text; new saved-scene format versioning and old-client write behavior are explicitly documented.
7. Canvas and SVG exports render formatting using measured glyph runs and an editor-appropriate render environment, without exposing markup in visible text.
8. Markdown ↔ formatted element ↔ Markdown passes semantic round-trip tests (and exact source preservation where explicitly promised); Obsidian-specific source/link round-trip is a later host integration test.

## Data model: choose an authority, not two copies

The hardest decision is the persisted source of truth. Two viable designs:

### A. Canonical Markdown source with computed plain text (preferred for interoperability; higher migration cost)

Conceptual schema (names illustrative, **not proposed public API names**):

```ts
{
  type: "text",
  originalText: "Important warning", // legacy/plain-text projection
  text: "Important warning",         // wrapped/display projection
  inlineSource?: " **Important** <span style=\"color:#e03131\">warning</span>",
  inlineSourceFormat?: "excalidraw-markdown-v1"
}
```

`inlineSource` is authoritative **when present**, including during WYSIWYG edits. `originalText` and `text` are derived projections, refreshed atomically by the editor. A consumer changing only `originalText` while leaving the source unchanged creates an ambiguity: define a transactional update API or explicit conflict/precedence rule rather than hoping the two values stay synchronized.

Prefer omitting `inlineSource` for legacy plain elements. On the first formatting action, initialize source from escaped original text. On removal of all formatting, optionally collapse back to the legacy representation. Parse source to a typed intermediate representation of plain text + marks; layout and rendering consume that representation, not raw Markdown.

### B. Canonical plain text with style ranges, Markdown as a lossless import/export codec (lower renderer disruption)

```ts
{
  originalText: "Important warning",
  inlineMarks?: [
    { start: 0, end: 9, kind: "bold" },
    { start: 10, end: 17, kind: "color", value: "#e03131" }
  ]
}
```

Markdown import parses into `originalText` + `inlineMarks`; export serializes the same to Markdown. This can be easier for cursor indices, text measurement, and existing renderers. It may also avoid duplicate authoritative fields. **However**, lossless *source* round-tripping is not guaranteed: distinct spellings (`_` versus `*`, HTML style casing, literal escaping) can normalize on export. Obsidian editing must preserve the host's intended semantics and metadata, and ideally avoid gratuitous rewrites. Mark offsets need explicit Unicode semantics (UTF-16, code points, or grapheme clusters), and transformations must update them on every insertion/deletion/wrap.

**Suggested decision:** Prototype B and A against the same acceptance tests before committing to the format. If preserving exact user-authored markup is a requirement, A (or B plus original-source preservation) is the safer starting point. If semantic Markdown round-tripping is enough, B may fit Excalidraw's architecture with less disruption. Do not promise byte-for-byte equality and zero migration cost simultaneously.

## Editing architecture

Use a pipeline with explicit boundaries:

```text
source Markdown subset <--> parser/serializer <--> text runs + marks
                                                |           |
                                      WYSIWYG selection   layout metrics
                                                |           |
                                         editor model    canvas/SVG renderer
```

- **Shared text model:** A small inline AST/run list, independent of a chosen editor library, with span text, marks, and source↔plain offsets. Serialize deterministically. Avoid persisting editor-specific DOM/Slate/Lexical/ProseMirror nodes.
- **Editor:** The existing textarea cannot display distinct run styles inside its text. A transparent textarea plus painted overlay can be explored for an incremental approach, but has real issues around IME/composition, selection ranges, bidi, line wrapping, browser zoom, screen readers, and mobile. Alternatively, a focused contenteditable editor/framework provides native styling but needs robust DOM↔model conversion and controlled paste. Choose based on tested accessibility and fidelity, not only bundle size.
- **Toolbar and shortcuts:** Bold/italic/strike/color operate on the selection using model transactions. Undo/redo, copy/paste, multi-line selections, and composition must retain marks.
- **Rendering:** Generate styled runs for canvas and SVG with identical line-breaking and positioning rules. Measure styles using the mounted editor's `RenderEnvironment` and document/window, including exports in iframes and popouts. A bold font may use different metrics from normal. SVG must preserve formatting without introducing unsafe HTML and respect the current export environment.
- **Wrapping:** Keep source unwrapped and convert layout wraps into derived display lines. Never commit layout-inserted newlines to canonical Markdown. Selection/source offsets must be stable across viewport and element width changes.
- **Plain projections:** Text extraction/search, element labels, bindings, Mermaid/clipboard paths, and consumer APIs get well-defined plain-text views. The source field is used only by clients that explicitly opt in.

## Obsidian compatibility contract

Obsidian's editable `## Text Elements` section should remain valid Markdown. It is *not* merely a human-readable cache: users and tools modify it outside Excalidraw. A minimum cross-repository integration would:

- Preserve text element IDs and block-reference links; retain Markdown links, wikilinks, and host-specific transformations within the Obsidian adapter without requiring upstream to parse them.
- Use a documented import/export contract to update formatted content from modified Markdown and to emit Markdown from canvas edits. Scene/plain-text projections must be regenerated consistently.
- Avoid treating formatted display text (or wrapped text) as the canonical source. Never lose mark information when a scene is saved or reloaded.
- Detect conflicting edits (canvas formatting versus the Markdown section) with a defined precedence/merge policy. Test external file edits, reloads, and mode switches.
- Load legacy drawings unchanged. If downstream clients ignore inline marks, degrade to a readable plain-text projection rather than exposing raw HTML tags unexpectedly.
- Retain cross-document runtime ownership: each editor/render/export operation uses its correct environment, not module-global DOM/canvas constructors.

This proposal **enables** compatibility; it does not claim Obsidian integration will work without adaptation. The exact reconciliation behavior and versioned serialization must be established jointly.

## Examples / acceptance criteria

| Input or operation | Expected outcome |
| --- | --- |
| Legacy `originalText: "Hello"` | Identical appearance and serialized behavior without opt-in formatting |
| `Hello **world**` | Plain text `Hello world`, bold run for `world`, stable save/reload |
| `*italic **and bold***` | Correct nested marks and selection/edit behavior |
| `<span style="color:#e03131">Alert</span>` | Color applies; no raw HTML injection; deterministic round-trip |
| Literal `\\*not emphasis\\*` | Literal asterisks after round-trip |
| Insert/delete within or at mark boundary | Mark range behavior predictable; no shifted ranges or lost text |
| Resize wrapped element | No Markdown source mutations due to synthetic line breaks |
| Paste rich HTML or unsafe HTML | Sanitized/converted subset or plain text; no script execution or silent content loss |
| Export PNG and SVG | Equivalent marks, measured positions, consistent fonts and source text |
| Obsidian Markdown section edited externally | Updated scene and markup, without erasing user formatting |
| Save/open in older consumer | Readable plain text; compatibility behavior documented |
| Main window + popout exports | Same formatting with correct per-window font/document ownership |
| CLI/agent changes source | Validated parse; stable diff and output; informative errors on unsupported constructs |

Additional tests: leading/trailing whitespace, CRLF, Unicode combining marks, emoji grapheme clusters, RTL/bidi, multi-line selections, escaped brackets and backticks, undo/redo, mobile IME, accessibility, text bindings and arrow labels, Markdown export/import idempotence, and performance on large diagrams.

## Work packages (not implementation in this PR)

1. **Agree on features and syntax:** define minimal marks and color normalization; settle unsupported/invalid input behavior. Decide whether exact source preservation or semantic round-trip is required.
2. **Build a codec proof of concept:** parse/serialize Markdown subset ↔ run model with property tests, escaping/nesting tests, and unformatted backward compatibility.
3. **Decide storage authority:** evaluate A versus B with edits through both API and Markdown files. Document source conflict rules, versioning, and migration.
4. **Prototype editor options:** selection handling, IME, paste, bidi, mobile, a11y, and package size. No framework commitment until demonstrated.
5. **Integrate canvas/SVG measurement:** cross-document RenderEnvironment, exports, cursor positions, and wrapping; verify visual parity.
6. **Host adapter and regression suite:** include Obsidian's `rawText` synchronization and scripts/CLI consumers; test popouts and external edits.

## Risks and open decisions

- **Source fidelity:** CommonMark, GFM strike, and inline HTML have different interoperability levels. A constrained extension is not guaranteed to render in every Markdown engine.
- **Colors/underline:** There is no universally adopted plain-Markdown syntax. Strict HTML subset is pragmatic but must be opt-in, sanitized, and documented; consider alternative extension syntax only with a concrete interoperability case.
- **Multiple representations:** `inlineSource` alongside legacy fields can become stale. Atomic updates or authoritative-only metadata are required.
- **Formatting across text changes:** run boundaries, grapheme indexing, and merges have nontrivial semantics.
- **Rendering fidelity:** SVG/canvas cannot simply strip Markdown delimiters; per-run metrics affect layout, bindings, exports, and scene geometry.
- **Scope creep:** links, inline fonts, arbitrary styles, lists, headings, and embedded HTML should not accidentally enter v1.
- **Tooling claim:** Markdown is generally friendlier for CLI/LLM workflows, but concise structured runs can also be agent-friendly; measure sample diff size, token counts, and error rates rather than asserting universal superiority.


## Editor implementation options: buy a small engine or build the narrow editor?

**Research checkpoint: 2026-10-20.** This is a candidate evaluation, not a library selection or an installed benchmark. Consider the **complete production integration cost**, including transitive dependencies, Markdown codec, sanitizer, React bindings, UI styling, and IME/accessibility code—not simply an npm package's reported core size.

Excalidraw does **not** need a general-purpose document editor for v1. It needs a single bounded inline text element, a few marks, predictable selection/undo/composition, a host-owned DOM and window, and a renderer independent of the editing widget. Excalidraw's existing textarea has mature positioning, keyboard, and composition behavior. The decision is whether to evolve that mechanism or replace just its *active editing surface*.

| Candidate | Main strengths | Cost / fit risks | Recommendation |
| --- | --- | --- | --- |
| **Custom minimal editor (existing textarea + styled overlay)** | Reuses Excalidraw's input, positioning, undo integration, theme; no editor-engine dependency; full visual control | Overlaid marks and selection can diverge; IME, bidi, emoji, composition, mobile text selection, screen readers and highlighting require careful testing; may become a home-grown editor framework | **Prototype only** if a restricted set of marks works without separate styled caret/selection layout |
| **Custom scoped `contenteditable` + small run model** | Native mixed inline styles, small dependency footprint, CSS can match Excalidraw; custom Markdown codec independent | Browser DOM normalization, paste sanitization, selection mapping, transaction/undo, composition and mobile handling become Excalidraw's responsibility | **Viable minimalist option**, but carry a strong browser/IME regression suite before selecting |
| **Lexical core + minimal React plugins** | Modular editor engine, transactions and selection handling; only import required features; custom nodes/commands and themes | Markdown extension may not preserve custom colors or source syntax without adapters; integration/runtime size and contenteditable positioning; potential mismatch with Excalidraw undo/model | **First library prototype**; compare build delta against the custom option |
| **ProseMirror core with minimal schema** | Mature schema + marks, transactions, selection/input handling; controlled subset; Markdown parser/serializer can be customized | Lower-level API, more glue code; renderer/host adapter still required; Markdown conversion may normalize source | **Strong alternative** if a minimal Lexical build is not lean or source mapping is easier in ProseMirror |
| **Tiptap (ProseMirror wrapper)** | Good ergonomics, extension architecture, menus and selection helpers; styling possible | Default presets/features can expand payload; Markdown support must be validated per mark; may be more editor than a one-element inline use case needs | **Fallback** if development speed outweighs dependency delta |
| **Milkdown (ProseMirror/remark ecosystem)** | Markdown-oriented conversion is central; useful reference for source↔document design | Broad Markdown-document model, remark/unified and ProseMirror stack; inline color/HTML subset still needs customization; potentially substantial bundle overhead | **Reference / optional prototype**, not default for a tiny text element |
| **Quill 2** | Mature rich-text input model with Delta operations and formats | Delta is canonical internally, Markdown requires a codec; editor/document styling/DOM lifecycle may not align with canvas text layout | **Lower priority** |
| **Full editors (CKEditor, TinyMCE, BlockNote)** | Feature-rich polished editing | Too broad for constrained inline styling, significant integration and payload cost | **Out of scope** |

### Size and complexity: evidence and caveats

A September 2026 third-party **end-to-end bundle comparison** reported roughly 105 KB gzip for a Lexical React setup, 123 KB for a Tiptap React setup, and 59 KB for Quill, while excluding CSS and depending on the specific imports. These figures are *not* comparable to a proposed custom minimal editor, not guaranteed reproducible for Excalidraw, and **not** a forecast of the actual Obsidian bundle delta. See [EditorStack benchmark](https://www.editorstack.cc/research/bundle-size-benchmark-2026), which documents its versions and bundling assumptions. Official documentation confirms Lexical's [modular extensions](https://lexicaljs.org/docs/packages/lexical) and Milkdown's [ProseMirror/Markdown stack](https://milkdown.dev/docs/guide/faq). An editor-size assessment should also include CSS, framework bindings, rich formatting plugins, Markdown parsing/serialization, sanitization, and any already-shared dependencies.

A **custom editor is not automatically cheaper** once caret mapping, Unicode/IME, accessibility, paste, and maintenance are counted. Conversely, installing a feature-complete editor for five inline marks may impose unnecessary code size and dependency churn. Avoid choosing on unqualified benchmark numbers.

### Proposed two-track spike

Build *disposable experiments*, not production integrations, against the same fixtures:

**Track 1 — minimal custom editor:** retain the existing textarea editor, first trying a noninteractive styled overlay for formatted display; if selection and styling cannot remain in sync under IME/bidi/mobile, separately test a narrowly controlled contenteditable with run-based transactions. Reuse Excalidraw menus/styles. Do not create a new general-purpose editor framework.

**Track 2 — Lexical minimal setup:** editor core + only essential rich text/history/selection bindings, no generic toolbar or full document plugins; mount within the existing canvas text editor overlay and translate edits into Excalidraw's independent run model. Measure the true dependency delta. If not viable, test bare ProseMirror with a minimal inline schema before adding Tiptap or Milkdown.

Both tracks must consume/emit the **same independent `InlineRuns` model and Markdown codec**, with one authority rule defined by the earlier RFC. This lets the project replace the UI engine without migrating saved scenes. The active editor DOM must be scoped to the mounted Excalidraw container's `ownerDocument`/`ownerWindow`; event listeners, selection APIs, portals, timers and font measurements must work in Obsidian popouts.

### Scorecard / decision gates

Use a reproducible comparison rather than selecting by reputation:

| Dimension | Suggested weight | Test |
| --- | ---: | --- |
| Input correctness and accessibility | **30%** | desktop/mobile IME, dead keys, emoji/graphemes, bidi, paste, keyboard commands, pointer selection, undo/redo, screen readers |
| Text/Markdown semantics | **25%** | nested marks, color spans, escaping, source↔plain offsets, external Markdown edits, round-trip stability |
| Excalidraw canvas integration | **20%** | rotated/scaled text overlay, wrapping, bindings, clipboard, selected toolbar state, font metrics, cross-document popouts |
| Runtime footprint | **15%** | actual incremental min+gzip and uncompressed Obsidian artifact, startup/render costs, externalized React, lazy-loading feasibility |
| Maintenance and theming | **10%** | CSS isolation, theme parity, API stability, dependency security/update load, test effort |

**Go/no-go thresholds are proposals, not measured outcomes:** no loss of plain text or styling in the defined subset; no known IME/accessibility or popout regression; measurable bundle/startup overhead documented on production build; HTML never trusted as raw DOM; identical scene formatting across canvas and SVG. Prefer the simpler solution only after correctness gates pass. A large library that meets correctness can still be rejected on footprint; a small custom editor that fails composition must be rejected despite its size.

### Initial recommendation

Keep the codec + model independent of editor choice. **Prototype a minimal custom route against a minimal Lexical route**, measure both *in this monorepo* with the existing Obsidian build constraints, then select. Bare ProseMirror is the next candidate if Lexical's source mapping or dependencies prove awkward. Avoid initially adopting a complete Markdown document editor simply because it already supports Markdown; in this use case Markdown is primarily the interchange/storage contract, not a requirement for a document-editing UI.

**Important:** This comparison does not recommend bypassing Excalidraw's own canvas/SVG text renderer. An editing widget's HTML appearance does not automatically make exported drawings render correctly or deterministically.

## Suggested upstream discussion

Could Excalidraw implement inline formatting with a deliberately small, documented Markdown-compatible interchange format behind a simple WYSIWYG editor? The goal is not to require users to edit Markdown or to add general HTML rendering, but to retain interoperability with plain-text/Markdown consumers and with CLI/agent workflows. In particular, Obsidian Excalidraw's editable Markdown Text Elements section needs a lossless path for externally edited text, while legacy Excalidraw scene consumers must still receive stable plain text.

I would first agree on the formatting subset, define the authoritative persisted representation and update contract, and validate a Markdown ↔ runs codec before selecting an editor technology. This could avoid binding scene data to any editor framework while leaving the on-canvas UX simple.

## Related implementation and discussion

- [Excalidraw PR #11997](https://github.com/excalidraw/excalidraw/pull/11997) — cross-document runtime ownership and upcoming rich-text/export requirements.
- [Excalidraw PR #12041](https://github.com/excalidraw/excalidraw/pull/12041) — style ranges approach for selected text colors (draft at writing).
- [Excalidraw PR #12098](https://github.com/excalidraw/excalidraw/pull/12098) — alternate selected-text color implementation.
- [Excalidraw issue #6678](https://github.com/excalidraw/excalidraw/issues/6678) — rich text editor request.
- [Obsidian Excalidraw `ExcalidrawData.ts`](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/src/shared/ExcalidrawData.ts) — `rawText`, `originalText`, `text` and Markdown-backed scene model.

**Non-goals of this proposal PR:** code implementation, plugin data migration, dependency changes, and changes to the fork inventory (there are no runtime fork customizations in this documentation-only PR).
