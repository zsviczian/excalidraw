/**
 * zsviczian -- exercise the real shared TTD/Dialog close path, without adapting
 * upstream test helpers. Desktop TTD must offer the phone close affordance.
 * Author: zsviczian. See dev-docs/Obsidian/contracts.md (TTD close control).
 */
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  Excalidraw,
  TTDDialog,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { configureObsidianExcalidrawHost } from "../../../packages/excalidraw/obsidianExcalidrawHost";

let dispose: () => void;
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);
beforeEach(() => {
  // JSDOM omits this browser API; actual scrolling is exercised in Chromium.
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  dispose = configureObsidianExcalidrawHost({
    protocolVersion: 3,
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
    runAction: () => {},
    getLabel: (key) => key,
    attachInlineLinkSuggester: () => ({
      isBlockingKeys: () => false,
      close: () => {},
    }),
    getMermaid: async () => ({
      loaded: true,
      api: Promise.resolve({
        parseMermaidToExcalidraw: async () => ({ elements: [] }),
      }),
    }),
  });
});

afterEach(() => {
  cleanup();
  dispose();
  if (originalScrollIntoView) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      originalScrollIntoView,
    );
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  }
});

it.each(["mermaid", "text-to-diagram", "fallback"] as const)(
  "%s has one named close button; closing preserves the scene and can reopen",
  async (variant) => {
    let api!: ExcalidrawImperativeAPI;
    const submit = vi.fn();
    render(
      <Excalidraw
        initialData={{
          elements: convertToExcalidrawElements([
            { type: "rectangle", x: 10, y: 10, width: 100, height: 80 },
          ]),
        }}
        onExcalidrawAPI={(value) => {
          if (value) {
            api = value;
          }
        }}
      >
        {variant !== "fallback" && (
          <TTDDialog
            onTextSubmit={submit}
            persistenceAdapter={{
              loadChats: async () => [],
              saveChats: async () => {},
            }}
          />
        )}
      </Excalidraw>,
    );
    await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
    await waitFor(() => expect(api?.getSceneElements()).toHaveLength(1));
    const tab = variant === "text-to-diagram" ? variant : "mermaid";
    const open = () =>
      act(() =>
        api.updateScene({ appState: { openDialog: { name: "ttd", tab } } }),
      );
    open();
    expect(api.getAppState().openDialog).toEqual({ name: "ttd", tab });
    const button = await waitFor(() => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        ".ttd-dialog .Dialog__close",
      );
      expect(buttons).toHaveLength(1);
      return buttons[0];
    });
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Close");
    expect(button.querySelector("svg")).not.toBeNull();
    expect(button.disabled).toBe(false);
    const elements = api!.getSceneElements();
    fireEvent.click(button);
    await waitFor(() =>
      expect(document.querySelector(".ttd-dialog")).toBeNull(),
    );
    expect(api!.getAppState().openDialog).toBeNull();
    expect(api!.getSceneElements()).toEqual(elements);
    expect(submit).not.toHaveBeenCalled();

    open();
    await waitFor(() =>
      expect(
        document.querySelector(".ttd-dialog .Dialog__close"),
      ).not.toBeNull(),
    );
    fireEvent.keyDown(document.querySelector(".ttd-dialog")!, {
      key: "Escape",
    });
    await waitFor(() =>
      expect(document.querySelector(".ttd-dialog")).toBeNull(),
    );
    expect(api!.getSceneElements()).toEqual(elements);
  },
);
