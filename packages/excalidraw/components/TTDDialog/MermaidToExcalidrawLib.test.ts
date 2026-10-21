/** zsviczian -- PR #472: preserve the host service across upstream lazy loading. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSharedMermaidInstance } from "../../obsidianUtils";

vi.mock("../../obsidianUtils", () => ({
  getSharedMermaidInstance: vi.fn(),
}));

const getMermaid = vi.mocked(getSharedMermaidInstance);

describe("host-provided Mermaid loading", () => {
  beforeEach(() => {
    vi.resetModules();
    getMermaid.mockReset();
  });

  const ready = () => ({
    loaded: true,
    api: Promise.resolve({
      parseMermaidToExcalidraw: vi.fn(async () => ({ elements: [] })),
    }),
  });

  it("retains the public loaded/api shape and shares only the host service", async () => {
    const service = ready();
    getMermaid.mockResolvedValue(service);
    const { loadMermaidLib, loadMermaidToExcalidrawLib } = await import(
      "./MermaidToExcalidrawLib"
    );
    expect(await loadMermaidLib()).toBe(service);
    expect(await loadMermaidToExcalidrawLib()).toBe(service);
    expect(getMermaid).toHaveBeenCalledTimes(1);
  });

  it("yields to activation and retries after the host is enabled", async () => {
    getMermaid
      .mockImplementationOnce(async () => ({
        loaded: false,
        api: Promise.reject(new Error("Extras is disabled")),
      }))
      .mockResolvedValueOnce(ready());
    const { loadMermaidDialogAPI, MermaidHostUnavailableError } = await import(
      "./MermaidToExcalidrawLib"
    );
    await expect(loadMermaidDialogAPI(vi.fn())).rejects.toBeInstanceOf(
      MermaidHostUnavailableError,
    );
    const api = await loadMermaidDialogAPI(vi.fn());
    await expect(
      api.parseMermaidToExcalidraw("graph TD; A-->B"),
    ).resolves.toEqual({
      elements: [],
    });
    expect(getMermaid).toHaveBeenCalledTimes(2);
  });

  it("retries a rejected host request without retaining a failed cache", async () => {
    getMermaid
      .mockRejectedValueOnce(new Error("host unavailable"))
      .mockResolvedValueOnce(ready());
    const { loadMermaidDialogAPI, MermaidHostUnavailableError } = await import(
      "./MermaidToExcalidrawLib"
    );
    await expect(loadMermaidDialogAPI(vi.fn())).rejects.toBeInstanceOf(
      MermaidHostUnavailableError,
    );
    await expect(loadMermaidDialogAPI(vi.fn())).resolves.toHaveProperty(
      "parseMermaidToExcalidraw",
    );
  });

  it("releases a rejected host module so a UI retry can obtain a new API", async () => {
    const error = new TypeError("Failed to fetch dynamically imported module");
    getMermaid
      .mockImplementationOnce(async () => ({
        loaded: true,
        api: Promise.reject(error),
      }))
      .mockResolvedValueOnce(ready());
    const { loadMermaidDialogAPI } = await import("./MermaidToExcalidrawLib");
    await expect(loadMermaidDialogAPI(vi.fn())).rejects.toBe(error);
    await expect(loadMermaidDialogAPI(vi.fn())).resolves.toHaveProperty(
      "parseMermaidToExcalidraw",
    );
    expect(getMermaid).toHaveBeenCalledTimes(2);
  });

  it("forwards config and reports only chunk failures against the exact API", async () => {
    const syntax = new Error("Parse error");
    const chunk = new TypeError("Failed to fetch dynamically imported module");
    const parse = vi
      .fn()
      .mockResolvedValueOnce({ elements: [] })
      .mockRejectedValueOnce(syntax)
      .mockRejectedValueOnce(chunk);
    getMermaid.mockResolvedValue({
      loaded: true,
      api: Promise.resolve({ parseMermaidToExcalidraw: parse }),
    });
    const { loadMermaidDialogAPI } = await import("./MermaidToExcalidrawLib");
    const onChunkError = vi.fn();
    const pending = loadMermaidDialogAPI(onChunkError);
    const api = await pending;
    const config = { themeVariables: { fontSize: "16px" } };
    await api.parseMermaidToExcalidraw("graph TD; A-->B", config);
    expect(parse).toHaveBeenLastCalledWith("graph TD; A-->B", config);
    await expect(api.parseMermaidToExcalidraw("invalid")).rejects.toBe(syntax);
    expect(onChunkError).not.toHaveBeenCalled();
    await expect(api.parseMermaidToExcalidraw("sequenceDiagram")).rejects.toBe(
      chunk,
    );
    expect(onChunkError).toHaveBeenCalledExactlyOnceWith(pending);
  });
});
