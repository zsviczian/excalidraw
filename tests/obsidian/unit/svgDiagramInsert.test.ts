/**
 * zsviczian -- plugin #3027: exercise the real TTD insertion boundary, including
 * synchronous native behavior, host choice, cancellation and editor teardown.
 * Author: zsviczian. See dev-docs/Obsidian/contracts.md.
 */
import { afterEach, expect, it, vi } from "vitest";
import { convertToExcalidrawElements } from "@excalidraw/element";

import type { FileId } from "@excalidraw/element/types";

import { insertToEditor } from "../../../packages/excalidraw/components/TTDDialog/common";
import {
  configureObsidianExcalidrawHost,
  OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
  type ObsidianExcalidrawHostAdapter,
  type ObsidianDiagramInsertion,
} from "../../../packages/excalidraw/obsidianExcalidrawHost";

import type {
  AppClassProperties,
  DataURL,
} from "../../../packages/excalidraw/types";

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
});
const native = () => ({
  elements: convertToExcalidrawElements([
    { type: "rectangle", x: 0, y: 0, width: 40, height: 20 },
  ]),
  files: null,
});
function svg(mermaid = true): ObsidianDiagramInsertion {
  const fileId = "svg" as FileId;
  const elements = convertToExcalidrawElements([
    {
      type: "image",
      fileId,
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      customData: mermaid ? { mermaidText: "pie\n A: 1" } : {},
    },
  ]);
  return {
    elements,
    files: {
      svg: {
        id: fileId,
        mimeType: "image/svg+xml",
        dataURL: "data:image/svg+xml;base64,PHN2Zy8+" as DataURL,
        created: 1,
      },
    },
  };
}
function host(
  prepare: ObsidianExcalidrawHostAdapter["prepareMermaidSVGInsert"],
) {
  dispose = configureObsidianExcalidrawHost({
    protocolVersion: OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
    isDoubleTapEraserEnabled: () => false,
    getZoomToFitMaxLevel: () => 2,
    isPenModeCrosshairVisible: () => false,
    isSingleFingerPanningEnabled: () => false,
    isDoubleClickTextEditingDisabled: () => false,
    getZoomStep: () => 0.1,
    getZoomMin: () => 0.1,
    getZoomMax: () => 30,
    isContextMenuDisabled: () => false,
    shouldSyncElementLinkWithText: () => false,
    loadFontFromFile: async () => undefined,
    getMermaid: async () => ({
      loaded: true,
      api: Promise.resolve({
        parseMermaidToExcalidraw: async () => ({ elements: [] }),
      }),
    }),
    runAction: () => {},
    getLabel: (key) => key,
    attachInlineLinkSuggester: () => ({
      isBlockingKeys: () => false,
      close: () => {},
    }),
    prepareMermaidSVGInsert: prepare,
  });
}
function app() {
  return {
    id: "initiating-editor",
    api: { isDestroyed: false },
    addElementsFromPasteOrLibrary: vi.fn(),
    setOpenDialog: vi.fn(),
  } as unknown as AppClassProperties;
}
it("native diagrams and ordinary SVG images insert synchronously without a prompt", async () => {
  const prepare = vi.fn(
    async (_id: string, data: ObsidianDiagramInsertion) => data,
  );
  host(prepare);
  for (const diagram of [native(), svg(false)]) {
    const editor = app();
    const pending = insertToEditor({ app: editor, data: { current: diagram } });
    expect(editor.addElementsFromPasteOrLibrary).toHaveBeenCalledOnce();
    await pending;
  }
  expect(prepare).not.toHaveBeenCalled();
});
it("standalone SVG Mermaid output retains upstream insertion without a configured host", async () => {
  const editor = app();
  const diagram = svg();
  await insertToEditor({ app: editor, data: { current: diagram } });
  expect(editor.addElementsFromPasteOrLibrary).toHaveBeenCalledWith(
    expect.objectContaining(diagram),
  );
});
it("offers the exact editor and stages converted elements without mutating source data", async () => {
  const editor = app();
  const source = svg();
  const before = JSON.stringify(source);
  const converted = native();
  host(async (id, data) => {
    expect(id).toBe(editor.id);
    expect(data).toBe(source);
    expect(editor.setOpenDialog).toHaveBeenCalledWith(null);
    return converted;
  });
  await insertToEditor({ app: editor, data: { current: source } });
  expect(editor.addElementsFromPasteOrLibrary).toHaveBeenCalledWith({
    ...converted,
    position: "center",
    fit: "scale-down",
  });
  expect(JSON.stringify(source)).toBe(before);
});
it("keep-image choice forwards the unchanged SVG and its files", async () => {
  host(async (_id, data) => data);
  const editor = app();
  const source = svg();
  await insertToEditor({ app: editor, data: { current: source } });
  expect(editor.addElementsFromPasteOrLibrary).toHaveBeenCalledWith({
    ...source,
    position: "center",
    fit: "scale-down",
  });
});
it("cancel inserts nothing", async () => {
  host(async () => null);
  const editor = app();
  await insertToEditor({ app: editor, data: { current: svg() } });
  expect(editor.addElementsFromPasteOrLibrary).not.toHaveBeenCalled();
});
it("a rejected host preparation reports its error without inserting or leaking a rejected task", async () => {
  const error = new Error("preparation failed");
  const report = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    host(async () => {
      throw error;
    });
    const editor = app();
    await expect(
      insertToEditor({ app: editor, data: { current: svg() } }),
    ).resolves.toBeUndefined();
    expect(editor.addElementsFromPasteOrLibrary).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(
      "Obsidian SVG diagram insertion failed",
      error,
    );
  } finally {
    report.mockRestore();
  }
});
it("late conversion cannot insert after the owning editor is destroyed", async () => {
  let finish!: (value: ObsidianDiagramInsertion) => void;
  host(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const editor = app();
  const pending = insertToEditor({ app: editor, data: { current: svg() } });
  editor.api = { ...editor.api, isDestroyed: true };
  finish(native());
  await pending;
  expect(editor.addElementsFromPasteOrLibrary).not.toHaveBeenCalled();
});
