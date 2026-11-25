/** zsviczian -- Protect paste preference and raw Markdown routing for PR #499. */
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { EDITOR_LS_KEYS } from "@excalidraw/common";
import { Excalidraw } from "@excalidraw/excalidraw";
import {
  configureObsidianExcalidrawHost,
  OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
} from "@excalidraw/excalidraw/obsidianExcalidrawHost";

import type { ExcalidrawTextElement } from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { createPasteEvent } from "../../../packages/excalidraw/clipboard";

const preference = EDITOR_LS_KEYS.PASTE_TEXT_AS_LINES;

afterEach(() => {
  cleanup();
  localStorage.removeItem(preference);
  vi.restoreAllMocks();
});

async function mountEditor() {
  let api!: ExcalidrawImperativeAPI;
  const editor = render(
    <Excalidraw
      handleKeyboardGlobally
      onExcalidrawAPI={(next) => {
        if (next) {
          api = next;
        }
      }}
    />,
  );
  await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
  const canvas = editor.container.querySelector("canvas.interactive")!;
  const container = editor.container.querySelector<HTMLElement>(
    ".excalidraw-container",
  )!;
  expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  expect(container).toBeInstanceOf(HTMLElement);
  const hitTest = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => canvas,
  });
  return {
    ...editor,
    restoreHitTest: () => {
      if (hitTest) {
        Object.defineProperty(document, "elementFromPoint", hitTest);
      } else {
        Reflect.deleteProperty(document, "elementFromPoint");
      }
    },
    paste: (text: string) => {
      act(() => container.focus());
      fireEvent(document, createPasteEvent({ types: { "text/plain": text } }));
    },
    texts: () =>
      api
        .getSceneElements()
        .map((element) => (element as ExcalidrawTextElement).rawText),
  };
}

it("remembers split and rejoins the same wrapped source with the next paste", async () => {
  const editor = await mountEditor();
  const source = "An unwrapped cafe\u0301\n\nThe second line";
  try {
    editor.paste(source);
    const split = await editor.findByRole("button", {
      name: "Split into separate text elements",
    });
    expect(editor.texts()).toEqual([source]);
    fireEvent.click(split);
    expect(localStorage.getItem(preference)).toBe("true");
    editor.paste(source);
    const join = await editor.findByRole("button", {
      name: "Paste as a single text element",
    });
    expect(editor.texts()).toEqual([
      "An unwrapped cafe\u0301",
      "The second line",
      "An unwrapped cafe\u0301",
      "The second line",
    ]);
    fireEvent.click(join);
    expect(editor.texts()).toEqual([
      "An unwrapped cafe\u0301",
      "The second line",
      source,
    ]);
    expect(localStorage.getItem(preference)).toBeNull();
  } finally {
    editor.restoreHitTest();
  }
});

it("keeps Markdown link and image source lines outside the remembered paste choice", async () => {
  const dispose = configureObsidianExcalidrawHost({
    protocolVersion: OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
    getZoomStep: () => 0.1,
    getZoomMin: () => 0.1,
    getZoomMax: () => 30,
    getZoomToFitMaxLevel: () => 10,
    isDoubleTapEraserEnabled: () => false,
    isPenModeCrosshairVisible: () => false,
    isSingleFingerPanningEnabled: () => false,
    isDoubleClickTextEditingDisabled: () => false,
    isContextMenuDisabled: () => false,
    shouldSyncElementLinkWithText: () => true,
    loadFontFromFile: async () => undefined,
    getMermaid: async () => {
      throw Error("Markdown links must not load Mermaid");
    },
    runAction() {},
    prepareMermaidSVGInsert: async (_id, diagram) => diagram,
    getLabel: (key) => key,
    attachInlineLinkSuggester: () => ({
      isBlockingKeys: () => false,
      close() {},
    }),
  });
  try {
    const editor = await mountEditor();
    try {
      localStorage.setItem(preference, "true");
      const source = ["[[Note|Label]]", "![[image.png]]", "[Second](notes.md)"];
      editor.paste(source.join("\n"));
      await waitFor(() => expect(editor.texts()).toEqual(source));
      expect(editor.container.querySelector(".Toast__action")).toBeNull();
      expect(localStorage.getItem(preference)).toBe("true");
    } finally {
      editor.restoreHitTest();
    }
  } finally {
    cleanup();
    dispose();
  }
});
