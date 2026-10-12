/**
 * zsviczian -- PR #465 wrap/frame integration regression coverage.
 * Exercise the real keyboard action and public history without window.h hooks:
 * Obsidian links and raw Markdown must survive deleted/restored containers.
 * https://github.com/zsviczian/excalidraw/pull/465
 */
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";

import {
  arrayToMap,
  type EditorInterface,
  type StylesPanelMode,
} from "@excalidraw/common";
import { configureObsidianCommonHost } from "@excalidraw/common/commonObsidianHost";
import {
  addElementsToFrame,
  getElementsCompletelyInFrame,
  getElementsInResizingFrame,
  newElement,
  newFrameElement,
  newTextElement,
  shouldApplyFrameClip,
} from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { getDefaultAppState } from "../appState";
import { Excalidraw } from "../index";

import type { ExcalidrawImperativeAPI } from "../types";

afterEach(cleanup);

const text = (link: string | null = "[[note]]") => ({
  ...newTextElement({
    x: 100,
    y: 100,
    text: "caption",
    rawText: "[[note|caption]]",
    link,
  }),
  id: "label",
});

const shape = (id: string, link: string | null = null) => ({
  ...newElement({
    type: "rectangle",
    x: 80,
    y: 80,
    width: 200,
    height: 100,
    link,
  }),
  id,
});

const frameState = () => ({
  ...getDefaultAppState(),
  width: 800,
  height: 600,
  offsetLeft: 0,
  offsetTop: 0,
});

async function mount(
  elements: ExcalidrawElement[],
  formFactor?: EditorInterface["formFactor"],
) {
  let api!: ExcalidrawImperativeAPI;
  render(
    <Excalidraw
      handleKeyboardGlobally={true}
      UIOptions={formFactor ? { getFormFactor: () => formFactor } : undefined}
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
      initialData={{ elements, appState: { theme: "dark" } }}
    />,
  );
  await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
  const select = (ids: string[]) =>
    act(() => {
      api.selectElements(
        api.getSceneElements().filter((element) => ids.includes(element.id)),
      );
    });
  const toggle = () =>
    act(async () => {
      fireEvent.keyDown(document, { key: "w", code: "KeyW" });
      fireEvent.keyUp(document, { key: "w", code: "KeyW" });
    });
  const get = (id: string) =>
    api
      .getSceneElementsIncludingDeleted()
      .find((element) => element.id === id)!;
  return { api, select, toggle, get };
}

describe("Obsidian wrap link ownership", () => {
  it.each(["full", "tray", "compact", "mobile"] as const)(
    "enables W in %s layout only when the layout is not mobile",
    async (mode: StylesPanelMode) => {
      const dispose = configureObsidianCommonHost({
        protocolVersion: 1,
        getDeviceInfo: () => null,
        getDesktopUIMode: () => mode,
        getPreferredUIMode: () => mode,
        getCanvasLimits: () => ({
          areaLimit: 16777216,
          widthHeightLimit: 32767,
        }),
        getHighlightColor: () => "#0076ff",
      });
      try {
        const { api, select, toggle } = await mount(
          [text()],
          mode === "compact"
            ? "tablet"
            : mode === "mobile"
            ? "phone"
            : "desktop",
        );
        select(["label"]);
        await toggle();
        expect(
          api
            .getSceneElements()
            .some((element) => element.type === "rectangle"),
        ).toBe(mode !== "mobile");
      } finally {
        cleanup();
        dispose();
      }
    },
  );

  it("moves explicit links through wrap, unwrap, rewrap and history without losing raw Markdown", async () => {
    const { api, select, toggle, get } = await mount([text()]);
    select(["label"]);
    await toggle();
    const container = api
      .getSceneElements()
      .find((element) => element.type === "rectangle")!;
    expect(container.link).toBe("[[note]]");
    expect(get("label").link).toBeNull();
    api.history.clear();
    await toggle();
    expect(get("label")).toMatchObject({
      containerId: null,
      link: "[[note]]",
      rawText: "[[note|caption]]",
    });
    expect(get(container.id)).toMatchObject({ isDeleted: true, link: null });
    await act(async () => api.history.undo());
    expect(get(container.id)).toMatchObject({
      isDeleted: false,
      link: "[[note]]",
    });
    expect(get("label").link).toBeNull();
    await act(async () => api.history.redo());
    expect(get("label").link).toBe("[[note]]");
  });

  it("merges distinct container/text links once and restores the original container on rewrap", async () => {
    const { select, toggle, get } = await mount([
      shape("container", "[[container]]"),
      text("[[text]]"),
    ]);
    select(["container", "label"]);
    await toggle();
    expect(get("container").link).toBe("[[container]] [[text]]");
    await toggle();
    expect(get("label").link).toBe("[[container]] [[text]]");
    await toggle();
    expect(get("container")).toMatchObject({
      isDeleted: false,
      link: "[[container]] [[text]]",
    });
    expect(get("label")).toMatchObject({
      containerId: "container",
      link: null,
      rawText: "[[note|caption]]",
    });
  });

  it("keeps the dark theme when wrapping and unwrapping a selection in a frame", async () => {
    const { api, select, toggle } = await mount([
      shape("first"),
      { ...shape("second"), x: 400 },
    ]);
    select(["first", "second"]);
    await toggle();
    const frame = api
      .getSceneElements()
      .find((element) => element.type === "frame")!;
    expect(api.getAppState().theme).toBe("dark");
    expect(
      api.getSceneElements().filter((element) => element.frameId === frame.id),
    ).toHaveLength(2);
    await toggle();
    expect(
      api.getSceneElements().some((element) => element.type === "frame"),
    ).toBe(false);
    expect(api.getAppState().theme).toBe("dark");
  });
});

describe("frame edge fixes with Obsidian marker guards", () => {
  it("contains an edge-aligned thick stroke and clips it as a frame child", () => {
    const frame = newFrameElement({ x: 0, y: 0, width: 100, height: 100 });
    const child = newElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      strokeWidth: 20,
    });
    const map = arrayToMap([frame, child]);
    expect(getElementsCompletelyInFrame([child], frame, map)).toEqual([child]);
    const children = addElementsToFrame([frame, child], [child], frame);
    expect(
      shouldApplyFrameClip(child, frame, frameState(), arrayToMap(children)),
    ).toBe(true);
  });

  it("never captures elements into a marker frame, including resize discovery", () => {
    const frame = newFrameElement({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      frameRole: "marker",
    });
    const child = newElement({
      type: "rectangle",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    });
    const elements = [frame, child];
    expect(addElementsToFrame(elements, [child], frame)).toBe(elements);
    expect(child.frameId).toBeNull();
    expect(
      getElementsInResizingFrame(
        elements,
        frame,
        frameState(),
        arrayToMap(elements),
      ),
    ).toEqual([]);
  });
});
