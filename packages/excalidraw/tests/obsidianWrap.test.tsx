/**
 * zsviczian -- PR #465 wrap/frame integration regression coverage.
 * Exercise the real keyboard action and public history without window.h hooks:
 * Obsidian links and raw Markdown must survive deleted/restored containers.
 * https://github.com/zsviczian/excalidraw/pull/465
 * PR #486: retained containers keep their links; only W-created containers are
 * deleted. Protect frame discovery and multi-step index restoration as well.
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
  CaptureUpdateAction,
  ElementsDelta,
  getElementsCompletelyInFrame,
  getElementsInResizingFrame,
  newElement,
  newArrowElement,
  newFrameElement,
  newImageElement,
  newStickyNoteElement,
  newTextElement,
  newElementWith,
  shouldApplyFrameClip,
} from "@excalidraw/element";

import { pointFrom } from "@excalidraw/math";

import type {
  ExcalidrawElement,
  FractionalIndex,
  SceneElementsMap,
} from "@excalidraw/element/types";

import { getDefaultAppState } from "../appState";
import { Excalidraw } from "../index";

import type { ExcalidrawImperativeAPI } from "../types";

afterEach(cleanup);

// Match the private padding used by actionFrame's selection discovery.
const FRAME_PADDING = 16;

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
    const { api, select, toggle, get } = await mount([
      shape("container", "[[container]]"),
      text("[[text]]"),
    ]);
    select(["container", "label"]);
    await toggle();
    expect(get("container").link).toBe("[[container]] [[text]]");
    await toggle();
    // zsviczian -- upstream #12638 retains an existing container on W unbind.
    expect(get("container")).toMatchObject({
      isDeleted: false,
      link: "[[container]] [[text]]",
    });
    expect(get("label")).toMatchObject({
      containerId: null,
      link: null,
      rawText: "[[note|caption]]",
    });
    expect(Object.keys(api.getAppState().selectedElementIds).sort()).toEqual([
      "container",
      "label",
    ]);
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
    await toggle();
    expect(get("container").link).toBe("[[container]] [[text]]");
    expect(get("label").link).toBeNull();
  });

  it("merges a link added to freed text back into the retained container without duplicating ownership", async () => {
    const { api, select, toggle, get } = await mount([
      shape("container", "[[container]]"),
      text(null),
    ]);
    select(["container", "label"]);
    await toggle();
    await toggle();
    await act(async () =>
      api.updateScene({
        elements: api
          .getSceneElements()
          .map((el) =>
            el.id === "label" ? newElementWith(el, { link: "[[added]]" }) : el,
          ),
        captureUpdate: CaptureUpdateAction.NEVER,
      }),
    );
    await toggle();
    expect(get("container")).toMatchObject({
      isDeleted: false,
      link: "[[container]] [[added]]",
    });
    expect(get("label")).toMatchObject({
      containerId: "container",
      link: null,
      rawText: "[[note|caption]]",
    });
  });

  it("frames deselected interior and near-edge elements while leaving distant overlaps and markers alone", async () => {
    const selected = {
      ...shape("selected"),
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      customData: { host: "preserved" },
    };
    const inside = {
      ...shape("inside"),
      x: 200,
      y: 50,
      width: 50,
      height: 50,
      link: "[[inside]]",
    };
    const near = {
      ...shape("near"),
      x: 20,
      y: 150,
      width: 100,
      height: 50 + FRAME_PADDING,
    };
    const far = {
      ...shape("far"),
      x: 150,
      y: 150,
      width: 100,
      height: 51 + FRAME_PADDING,
    };
    const marker = {
      ...newFrameElement({
        x: 60,
        y: 60,
        width: 30,
        height: 30,
        frameRole: "marker",
      }),
      id: "marker",
    };
    const { api, select, toggle, get } = await mount([
      selected,
      far,
      inside,
      near,
      marker,
    ]);
    select(["selected"]);
    await toggle();
    const frame = api
      .getSceneElements()
      .find((el) => el.type === "frame" && el.frameRole !== "marker")!;
    expect(["selected", "inside", "near"].map((id) => get(id).frameId)).toEqual(
      [frame.id, frame.id, frame.id],
    );
    expect(get("far").frameId).toBeNull();
    expect(get("marker")).toMatchObject({
      frameId: null,
      frameRole: "marker",
      isDeleted: false,
    });
    expect(get("inside").link).toBe("[[inside]]");
    expect(get("selected").customData).toEqual({ host: "preserved" });
    const order = api.getSceneElements().map((el) => el.id);
    expect(order.indexOf(frame.id)).toBeLessThan(order.indexOf("far"));
    expect(frame).toMatchObject({
      x: -FRAME_PADDING,
      y: -FRAME_PADDING,
      width: 300 + FRAME_PADDING * 2,
      height: 200 + FRAME_PADDING * 3,
    });
  });

  it("frames complete unselected groups including locked members", async () => {
    const { api, select, toggle, get } = await mount([
      { ...shape("selected"), x: 0, y: 0, width: 300, height: 200 },
      {
        ...shape("first"),
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        groupIds: ["group"],
      },
      {
        ...shape("locked"),
        x: 150,
        y: 50,
        width: 50,
        height: 50,
        groupIds: ["group"],
        locked: true,
      },
    ]);
    select(["selected"]);
    await toggle();
    const frame = api.getSceneElements().find((el) => el.type === "frame")!;
    expect(
      ["selected", "first", "locked"].map((id) => get(id).frameId),
    ).toEqual([frame.id, frame.id, frame.id]);
    expect(get("locked").locked).toBe(true);
  });

  it("restores stacking order over three undos with deleted index collisions and host metadata", async () => {
    const rectangle = (id: string, index: string) => ({
      ...shape(id, `[[${id}]]`),
      index: index as FractionalIndex,
      customData: { hostId: id },
    });
    const z = rectangle("z", "a1V");
    const y = rectangle("y", "a2");
    const a = rectangle("a", "a1G");
    const b = rectangle("b", "a1V");
    const c = rectangle("c", "a4");
    const { api, get } = await mount([z, y]);
    api.history.clear();
    const at = (element: ExcalidrawElement, index: string) =>
      newElementWith(element, { index: index as FractionalIndex });
    const yBack = at(y, "a0V");
    const zForward = at(z, "a2");
    for (const elements of [
      [yBack, z],
      [yBack, a, b, zForward, c],
      [yBack, at(b, "a0Z"), a, at(c, "a1l"), zForward],
    ]) {
      await act(async () =>
        api.updateScene({
          elements,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        }),
      );
    }
    const forward = api.getSceneElements().map((el) => el.id);
    for (let i = 0; i < 3; i++) {
      await act(async () => api.history.undo());
    }
    expect(api.getSceneElements().map((el) => el.id)).toEqual(["z", "y"]);
    expect(get("z")).toMatchObject({
      link: "[[z]]",
      customData: { hostId: "z" },
    });
    expect(get("y")).toMatchObject({
      link: "[[y]]",
      customData: { hostId: "y" },
    });
    for (let i = 0; i < 3; i++) {
      await act(async () => api.history.redo());
    }
    expect(api.getSceneElements().map((el) => el.id)).toEqual(forward);
  });

  it("moves attached arrows onto generated containers and back without losing host links", async () => {
    const label = {
      ...text(),
      boundElements: [{ type: "arrow" as const, id: "arrow" }],
    };
    const arrow = {
      ...newArrowElement({
        type: "arrow",
        x: 150,
        y: 400,
        width: 0,
        height: 250,
        points: [pointFrom(0, 0), pointFrom(0, -250)],
      }),
      id: "arrow",
      endBinding: {
        elementId: "label",
        fixedPoint: [0.5, 1] as [number, number],
        mode: "orbit" as const,
      },
    };
    const { api, select, toggle, get } = await mount([label, arrow]);
    select(["label"]);
    await toggle();
    const container = api
      .getSceneElements()
      .find((e) => e.type === "rectangle")!;
    expect(get("arrow")).toMatchObject({
      endBinding: { elementId: container.id },
    });
    await toggle();
    expect(get(container.id)).toMatchObject({ isDeleted: true, link: null });
    expect(get("arrow")).toMatchObject({ endBinding: { elementId: "label" } });
    expect(get("label")).toMatchObject({
      link: "[[note]]",
      boundElements: [{ id: "arrow", type: "arrow" }],
    });
    await toggle();
    expect(get("arrow")).toMatchObject({
      endBinding: { elementId: container.id },
    });
    expect(get(container.id)).toMatchObject({
      isDeleted: false,
      link: "[[note]]",
      boundElements: expect.arrayContaining([
        { id: "arrow", type: "arrow" },
        { id: "label", type: "text" },
      ]),
    });
    expect(get("label")).toMatchObject({
      containerId: container.id,
      boundElements: null,
      rawText: "[[note|caption]]",
    });
  });

  it("keeps an existing labeled arrow and its link when unbound and rebound", async () => {
    const arrow = {
      ...newArrowElement({
        type: "arrow",
        x: 0,
        y: 0,
        width: 300,
        height: 100,
        points: [pointFrom(0, 0), pointFrom(300, 100)],
        link: "[[arrow]]",
      }),
      id: "arrow",
      boundElements: [{ id: "label", type: "text" as const }],
    };
    const label = { ...text(null), containerId: "arrow", labelPosition: 0.5 };
    const { select, toggle, get } = await mount([arrow, label]);
    select(["arrow"]);
    await toggle();
    expect(get("arrow")).toMatchObject({ isDeleted: false, link: "[[arrow]]" });
    expect(get("label")).toMatchObject({ containerId: null, link: null });
    await toggle();
    expect(get("arrow")).toMatchObject({
      isDeleted: false,
      link: "[[arrow]]",
      boundElements: [{ id: "label", type: "text" }],
    });
    expect(get("label")).toMatchObject({
      containerId: "arrow",
      labelPosition: 0.5,
      rawText: "[[note|caption]]",
    });
  });

  it("restores a sticky label with its new font size and ink while retaining its link", async () => {
    const note = {
      ...newStickyNoteElement({
        type: "stickynote",
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        link: "[[sticky]]",
      }),
      id: "note",
    };
    const { api, select, toggle, get } = await mount([note, text(null)]);
    select(["note", "label"]);
    await toggle();
    expect(get("label")).toMatchObject({
      containerId: "note",
      baseFontSize: 20,
    });
    select(["note"]);
    await toggle();
    await act(async () =>
      api.updateScene({
        elements: api
          .getSceneElements()
          .map((e) =>
            e.id === "label" && e.type === "text"
              ? newElementWith(e, { fontSize: 36, strokeColor: "#ff0000" })
              : e,
          ),
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      }),
    );
    await toggle();
    expect(get("note")).toMatchObject({
      isDeleted: false,
      link: "[[sticky]]",
      strokeColor: "#ff0000",
    });
    expect(get("label")).toMatchObject({
      containerId: "note",
      baseFontSize: 36,
      strokeColor: "#ff0000",
      link: null,
    });
  });

  it("frames an image edge to edge while capturing protruding marks", async () => {
    const image = {
      ...newImageElement({
        type: "image",
        x: 100,
        y: 100,
        width: 300,
        height: 200,
      }),
      id: "image",
    };
    const mark = {
      ...shape("mark", "[[mark]]"),
      x: 350,
      y: 150,
      width: 60,
      height: 60,
    };
    const { api, select, toggle, get } = await mount([image, mark]);
    select(["image"]);
    await toggle();
    const frame = api.getSceneElements().find((e) => e.type === "frame")!;
    expect(frame).toMatchObject({ x: 100, y: 100, width: 300, height: 200 });
    expect(get("mark")).toMatchObject({ frameId: frame.id, link: "[[mark]]" });
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

it("index conflict resolution preserves unchanged caller objects and gives each element a distinct index", () => {
  const before = arrayToMap([
    { ...shape("c"), index: "a1" as FractionalIndex },
    { ...shape("a"), index: "a2" as FractionalIndex },
    { ...shape("b"), index: "a3" as FractionalIndex, isDeleted: true },
  ]) as SceneElementsMap;
  const snapshot = JSON.parse(JSON.stringify([...before.values()]));
  const next = new Map(before) as SceneElementsMap;
  next.set(
    "a",
    newElementWith(before.get("a")!, { index: "a1" as FractionalIndex }),
  );
  next.set(
    "b",
    newElementWith(before.get("b")!, { index: "a1" as FractionalIndex }),
  );
  const [restored] = ElementsDelta.calculate(before, next).applyTo(before);
  expect([...before.values()]).toEqual(snapshot);
  expect(restored.get("c")).toBe(before.get("c"));
  expect([...restored.keys()]).toEqual(["a", "b", "c"]);
  expect(new Set([...restored.values()].map((el) => el.index)).size).toBe(
    restored.size,
  );
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
