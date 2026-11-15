/**
 * zsviczian -- PR #485: upstream caret anchors must retain live host zoom policy.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/485
 */
import { afterEach, expect, it, vi } from "vitest";

import { configureObsidianExcalidrawHost } from "@excalidraw/excalidraw/obsidianExcalidrawHost";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { getActiveTextElement } from "@excalidraw/element";

import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";

import { getDefaultAppState } from "../../../packages/excalidraw/appState";
import {
  actionResetZoom,
  actionZoomIn,
  actionZoomOut,
} from "../../../packages/excalidraw/actions/actionCanvas";

import type {
  AppClassProperties,
  AppState,
} from "../../../packages/excalidraw/types";

let dispose: (() => void) | undefined;

it("active text lookup preserves the public two-argument call and accepts a current scene map", () => {
  const original = convertToExcalidrawElements([
    { type: "text", text: "Label", x: 20, y: 30 },
  ])[0];
  if (original.type !== "text") {
    throw Error("Invalid text fixture");
  }
  const current = { ...original, width: original.width + 100 };
  const editing = { editingTextElement: original };
  expect(getActiveTextElement([], editing)).toBe(original);
  expect(
    getActiveTextElement([], editing, new Map([[current.id, current]])),
  ).toBe(current);
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
});

function policy() {
  const live = { step: 0.07, min: 0.01, max: 40 };
  dispose = configureObsidianExcalidrawHost({
    protocolVersion: 4,
    getZoomStep: () => live.step,
    getZoomMin: () => live.min,
    getZoomMax: () => live.max,
    getZoomToFitMaxLevel: () => 10,
    isDoubleTapEraserEnabled: () => false,
    isPenModeCrosshairVisible: () => false,
    isSingleFingerPanningEnabled: () => false,
    isDoubleClickTextEditingDisabled: () => false,
    isContextMenuDisabled: () => false,
    shouldSyncElementLinkWithText: () => false,
    loadFontFromFile: async () => undefined,
    getMermaid: async () => {
      throw Error("Zoom must not load Mermaid");
    },
    runAction() {},
    prepareMermaidSVGInsert: async (_id, diagram) => diagram,
    getLabel: (key) => key,
    attachInlineLinkSuggester: () => ({
      isBlockingKeys: () => false,
      close() {},
    }),
  });
  return live;
}

function state(): AppState {
  return {
    ...getDefaultAppState(),
    width: 1000,
    height: 700,
    offsetLeft: 33,
    offsetTop: 21,
    scrollX: 15,
    scrollY: -20,
    zoom: { value: 1.3 as NormalizedZoomValue },
  };
}

async function zoom(
  action: typeof actionZoomIn | typeof actionZoomOut | typeof actionResetZoom,
  current: AppState,
  anchor: unknown = null,
) {
  const app = { requestUnfollow: vi.fn() } as unknown as AppClassProperties;
  const result = await action.perform([], current, anchor, app);
  if (!result) {
    throw Error("Zoom action unexpectedly cancelled");
  }
  expect(app.requestUnfollow).toHaveBeenCalledOnce();
  return { ...current, ...result.appState };
}

for (const action of [actionZoomIn, actionZoomOut, actionResetZoom]) {
  for (const kind of ["caret", "center"] as const) {
    it(`${action.name} preserves its ${kind} anchor with a non-default host step and canvas offsets`, async () => {
      policy();
      const before = state();
      const anchor =
        kind === "caret"
          ? { viewportX: 243, viewportY: 198 }
          : {
              viewportX: before.offsetLeft + before.width / 2,
              viewportY: before.offsetTop + before.height / 2,
            };
      const sceneX =
        (anchor.viewportX - before.offsetLeft) / before.zoom.value -
        before.scrollX;
      const sceneY =
        (anchor.viewportY - before.offsetTop) / before.zoom.value -
        before.scrollY;
      const next = await zoom(action, before, kind === "caret" ? anchor : null);
      expect(
        (sceneX + next.scrollX) * next.zoom.value + next.offsetLeft,
      ).toBeCloseTo(anchor.viewportX);
      expect(
        (sceneY + next.scrollY) * next.zoom.value + next.offsetTop,
      ).toBeCloseTo(anchor.viewportY);
      expect(next.zoom.value).toBeCloseTo(
        action === actionZoomIn ? 1.37 : action === actionZoomOut ? 1.23 : 1,
      );
    });
  }
}

it("keyboard zoom reads changed host steps and clamps to live limits", async () => {
  const live = policy();
  let next = await zoom(actionZoomIn, state());
  expect(next.zoom.value).toBeCloseTo(1.37);
  live.step = 0.13;
  next = await zoom(actionZoomIn, next);
  expect(next.zoom.value).toBeCloseTo(1.5);
  live.max = 1.51;
  next = await zoom(actionZoomIn, next);
  expect(next.zoom.value).toBeCloseTo(1.51);
  live.min = 1.5;
  expect((await zoom(actionZoomOut, next)).zoom.value).toBeCloseTo(1.5);
});
