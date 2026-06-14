Here's a CONTRIBUTING.md draft that reflects the philosophy you've described.

# Contributing to @zsviczian/excalidraw

Thank you for your interest in contributing.

Before opening a pull request, please understand that this repository is **not the primary place for Excalidraw development**. This repository is a fork maintained for the Obsidian Excalidraw plugin and follows a very conservative approach to code changes.

## First: Can This Be Added Upstream?

The preferred place for almost all Excalidraw improvements is the main Excalidraw project.

Before submitting a PR here, please ask yourself:

* Can this change be implemented in the upstream Excalidraw component?
* Have you discussed or attempted the change upstream?
* Is the change genuinely impossible or inappropriate to include in the main Excalidraw codebase?

Examples of changes that may belong in this fork:

* Obsidian-specific integrations
* Obsidian-only workflows
* Plugin-specific functionality that has no value in the standalone Excalidraw application
* Technical limitations that prevent the change from being accepted upstream

If the change can reasonably be implemented in Excalidraw itself, please contribute it there instead.

## Keep Changes Extremely Small

I accept only highly targeted modifications to the Excalidraw codebase.

Every divergence from upstream increases the complexity, risk, and effort required to merge future Excalidraw releases into this fork.

To keep the project maintainable:

* Changes must be minimal in scope.
* Changes must solve a clearly defined problem.
* Changes must avoid refactoring unrelated code.
* Changes must avoid introducing new abstractions unless absolutely necessary.
* Large-scale modifications will generally be rejected.

When evaluating a PR, maintainability during future upstream merges is often a more important consideration than the benefit of the proposed feature.

## Document Every Modification

If you modify a single existing line, annotate the change directly on that line.

Example:

```ts
const value = getValue(); //github-user --reason for change, #issue-or-pr
```

The comment should include:

* Your GitHub username
* The reason for the modification
* Relevant issue number, PR number, or discussion reference

Future maintainers must be able to understand why the line differs from upstream.

## Prefer New Functions Over Modifying Existing Logic

If a change affects a block of code, do not directly modify the existing Excalidraw implementation unless there is no alternative.

Instead:

1. Create a dedicated function.
2. Prefer placing the function in `ObsidianUtils.ts` whenever possible.
3. Keep Obsidian-specific logic isolated from Excalidraw logic.

This approach makes future merges significantly easier because modifications become easy to identify and review.

### Function Documentation Requirements

All newly introduced helper functions should contain:

* A detailed header comment explaining why the function exists
* Your GitHub username
* Links to relevant issues, PRs, discussions, or design conversations
* Comments throughout the implementation where necessary

Example:

```ts
/**
 * Purpose:
 *   Explain why this functionality cannot be implemented upstream.
 *
 * Author:
 *   github-user
 *
 * References:
 *   #123
 *   https://github.com/...
 *
 * Notes:
 *   This exists only for Obsidian-specific behavior.
 */
export function myHelper() {
  ...
}
```

## If You Must Insert a Code Block

Sometimes a localized modification cannot reasonably be extracted into a separate function.

In those rare cases, clearly mark the inserted section.

Example:

```ts
//github-user START --reason, description, links

...

//github-user END
```

The marker should explain:

* Who added the code
* Why it exists
* Relevant issue, PR, discussion, or reference links

This makes future merge conflicts substantially easier to understand and resolve.

## Pull Request Expectations

When opening a PR, please explain:

1. Why the change cannot be implemented upstream.
2. Why the change is required for the Obsidian plugin.
3. Why the implementation was kept as small as possible.
4. What alternatives were considered.

PRs that introduce broad modifications to Excalidraw internals without strong justification are unlikely to be accepted.

## Final Note

I am extremely conservative when accepting changes to this fork.

The primary goal is to remain as close as possible to upstream Excalidraw while supporting the specific needs of the Obsidian plugin.

When in doubt, choose the solution that creates the smallest possible difference from upstream.
