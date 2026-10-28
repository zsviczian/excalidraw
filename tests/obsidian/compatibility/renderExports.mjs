// zsviczian -- fail-closed test-only repair for Vitest's star-export shadowing, fork #477.
import { createHash } from "node:crypto";

import * as testingLibrary from "@testing-library/react";

const fingerprint =
  "a39e3ac551e15e3ac2176082ac58ff7caf86e15303ff2c000a150250a3058ef7";
export function resolveInheritedRenderExport(source) {
  const normalized = source.replaceAll("\r\n", "\n");
  if (createHash("sha256").update(normalized).digest("hex") !== fingerprint) {
    throw Error(
      "Inherited test-utils changed: review the pinned render-export compatibility transform",
    );
  }
  const star = 'export * from "@testing-library/react";';
  if (
    source.split(star).length !== 2 ||
    !source.includes("export { renderApp as render };")
  ) {
    throw Error("Inherited render-export anchors differ");
  }
  // Keep the actual renderApp and imported render implementations intact. Explicit
  // runtime exports prevent Vitest's export-all helper from claiming `render` first.
  const names = Object.keys(testingLibrary).filter(
    (name) => name !== "render" && name !== "default" && /^[$\w]+$/.test(name),
  );
  return source.replace(
    star,
    `export { ${names.join(", ")} } from "@testing-library/react";`,
  );
}
export function inheritedRenderExportsPlugin() {
  return {
    name: "obsidian-inherited-render-exports",
    enforce: "pre",
    transform(source, id) {
      if (
        id
          .replaceAll("\\", "/")
          .split("?")[0]
          .endsWith("/packages/excalidraw/tests/test-utils.ts")
      ) {
        return { code: resolveInheritedRenderExport(source), map: null };
      }
      if (
        id
          .replaceAll("\\", "/")
          .split("?")[0]
          .endsWith("/packages/excalidraw/tests/helpers/ui.ts")
      ) {
        return { code: resolveInheritedToolClock(source), map: null };
      }
    },
  };
}

export function resolveInheritedToolClock(source) {
  const normalized = source.replaceAll("\r\n", "\n");
  if (
    createHash("sha256").update(normalized).digest("hex") !==
    "4bd2537e19101df4b051808dfb802df4e12574960374d4f922480c5afc2f5b8b"
  ) {
    throw Error(
      "Inherited ui helper changed: review the pinned tool-clock compatibility transform",
    );
  }
  const original =
    "fireEvent.click(GlobalTestState.renderResult.getByToolName(toolName));";
  if (source.split(original).length !== 2) {
    throw Error("Inherited tool-click anchor differs");
  }
  // The fork schedules setActiveTool in its owning window. The synchronous
  // upstream helper must complete that zero-delay task before drawing. Limit
  // the fake clock to this helper action; never replace App or its setState.
  // Trusted browser/native input separately verifies real timer ordering.
  return `import { vi as obsidianTestClock } from "vitest";\nimport { act as obsidianClockAct } from "@testing-library/react";\n${source.replace(
    original,
    `
    const ownsClock = !obsidianTestClock.isFakeTimers();
    if (ownsClock) obsidianTestClock.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      obsidianClockAct(() => {
        ${original}
        obsidianTestClock.advanceTimersByTime(0);
      });
    } finally { if (ownsClock) obsidianTestClock.useRealTimers(); }
  `,
  )}`;
}
