/**
 * zsviczian -- Mermaid previews must match the exported canvas rather than a
 * host's --default-bg-color. Kept fork-owned to avoid upstream test churn.
 * Author: zsviczian. See dev-docs/Obsidian/contracts.md (Mermaid previews).
 */
import { afterEach, expect, it, vi } from "vitest";

import { exportScene } from "@excalidraw/utils";

import {
  convertMermaidToExcalidraw,
  resetPreview,
} from "../../../packages/excalidraw/components/TTDDialog/common";

vi.mock("@excalidraw/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@excalidraw/utils")>()),
  exportScene: vi.fn(),
}));

afterEach(() => {
  vi.resetAllMocks();
  document.body.replaceChildren();
});

it.each(["light", "dark"] as const)(
  "%s preview ignores host colors, retains export errors and resets cleanly",
  async (theme) => {
    const parent = document.createElement("div");
    parent.style.setProperty("--default-bg-color", "#595850");
    const content = parent.appendChild(document.createElement("div"));
    document.body.appendChild(parent);
    const canvas = document.createElement("canvas");
    vi.mocked(exportScene).mockResolvedValueOnce(canvas);
    const args: Parameters<typeof convertMermaidToExcalidraw>[0] = {
      canvasRef: { current: content },
      mermaidToExcalidrawLib: {
        status: "loaded",
        api: Promise.resolve({
          parseMermaidToExcalidraw: vi.fn().mockResolvedValue({
            elements: [{ type: "rectangle", width: 100, height: 100 }],
          }),
        }),
      },
      mermaidDefinition: "flowchart TD; A-->B",
      setError: vi.fn(),
      data: { current: { elements: [], files: null } },
      theme,
    };
    const expected =
      theme === "light" ? "rgb(255, 255, 255)" : "rgb(18, 18, 18)";
    expect(await convertMermaidToExcalidraw(args)).toEqual({ success: true });
    expect(parent.style.background).toBe(expected);
    expect(content.firstElementChild).toBe(canvas);
    expect(exportScene).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ theme }) }),
    );

    const error = new Error("preview export failed");
    vi.mocked(exportScene).mockRejectedValueOnce(error);
    expect(await convertMermaidToExcalidraw(args)).toEqual({
      success: false,
      error,
    });
    expect(args.setError).toHaveBeenLastCalledWith(error);
    expect(parent.style.background).toBe(expected);

    resetPreview(args);
    expect(parent.style.background).toBe("");
    expect(content.childNodes).toHaveLength(0);
    expect(args.setError).toHaveBeenLastCalledWith(null);
    expect(parent.style.getPropertyValue("--default-bg-color")).toBe("#595850");
  },
);
