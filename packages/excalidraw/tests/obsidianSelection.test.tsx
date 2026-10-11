/**
 * zsviczian -- PR #458/#462 selection-extraction regression coverage.
 * Exercise the mounted editor through its public API, without the fork's
 * disabled window.h hooks, so locked overlap and Alt-click coexistence remain
 * testable in the standard Vitest lane.
 * https://github.com/zsviczian/excalidraw/pull/458
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
  newElement,
  newLinearElement,
  newFrameElement,
} from "@excalidraw/element";

import { pointFrom, type LocalPoint } from "@excalidraw/math";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import type { ExcalidrawImperativeAPI } from "../types";

afterEach(cleanup);

const rectangle = (id: string, locked = false, groupIds: string[] = []) => ({
  ...newElement({
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    backgroundColor: "#ffffff",
    fillStyle: "solid",
    locked,
    groupIds,
  }),
  id,
});

async function mount(elements: ExcalidrawElement[]) {
  let api!: ExcalidrawImperativeAPI;
  const result = render(
    <Excalidraw
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
      initialData={{ elements, appState: { scrollX: 0, scrollY: 0 } }}
    />,
  );
  await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
  const canvas =
    result.container.querySelector<HTMLCanvasElement>("canvas.interactive")!;

  // jsdom has no native PointerEvent. Use its MouseEvent with the pointer
  // fields React/Excalidraw consume, retaining the real event dispatch path.
  const click = (altKey = false) => {
    const state = api.getAppState();
    const clientX = (200 + state.scrollX) * state.zoom.value + state.offsetLeft;
    const clientY = (200 + state.scrollY) * state.zoom.value + state.offsetTop;
    for (const type of ["pointerdown", "pointerup"]) {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        altKey,
        button: 0,
        buttons: type === "pointerdown" ? 1 : 0,
      });
      Object.defineProperties(event, {
        pointerType: { value: "mouse" },
        pointerId: { value: 1 },
      });
      fireEvent(canvas, event);
    }
  };
  const selected = () => Object.keys(api.getAppState().selectedElementIds);
  return { api, click, selected };
}

describe("Obsidian selection after the upstream extraction", () => {
  it("selects the topmost unlocked overlap under a locked overlay", async () => {
    const { click, selected } = await mount([
      rectangle("bottom"),
      rectangle("middle"),
      rectangle("locked", true),
    ]);
    click();
    expect(selected()).toEqual(["middle"]);
  });

  it("does not select an isolated locked element", async () => {
    const { click, selected } = await mount([rectangle("locked", true)]);
    click();
    expect(selected()).toEqual([]);
  });

  it("cycles only unlocked overlaps and wraps under a locked overlay", async () => {
    const { api, click, selected } = await mount([
      rectangle("bottom"),
      rectangle("middle"),
      rectangle("locked", true),
    ]);
    click();
    expect(selected()).toEqual(["middle"]);
    click(true);
    expect(selected()).toEqual(["bottom"]);
    click(true);
    expect(selected()).toEqual(["middle"]);
    expect(api.getSceneElements()).toHaveLength(3);
  });

  it("preserves a host-selected group, then cycles it as one unit", async () => {
    const { api, click, selected } = await mount([
      rectangle("bottom", false, ["group"]),
      rectangle("middle", false, ["group"]),
      rectangle("top"),
      rectangle("locked", true),
    ]);
    act(() => api.selectElements(api.getSceneElements().slice(0, 2)));
    expect(selected().sort()).toEqual(["bottom", "middle"]);
    click(true);
    expect(selected()).toEqual(["top"]);
    click(true);
    expect(selected().sort()).toEqual(["bottom", "middle"]);
    expect(api.getAppState().selectedGroupIds).toEqual({ group: true });
    expect(api.getSceneElements()).toHaveLength(4);
  });
});

// zsviczian START -- preserve host selection contracts alongside upstream's new API, PR #462
// https://github.com/zsviczian/excalidraw/pull/462
describe("Obsidian and upstream selection API coexistence", () => {
  it("keeps host selection synchronous, including locked search results without expanding groups", async () => {
    const { api, selected } = await mount([
      rectangle("first", false, ["group"]),
      rectangle("second", false, ["group"]),
      rectangle("locked", true),
    ]);
    act(() => {
      api.selectElements([api.getSceneElements()[0]], true);
      // A host z-order action reads this state in the same call.
      expect(selected()).toEqual(["first"]);
      expect(api.getAppState().highlightSearchResult).toBe(true);
      api.selectElements([api.getSceneElements()[2]]);
      expect(selected()).toEqual(["locked"]);
      expect(api.getAppState().highlightSearchResult).toBe(false);
    });
  });

  it("keeps host z-order changes scoped to the requested element", async () => {
    const { api } = await mount([
      rectangle("first", false, ["group"]),
      rectangle("second", false, ["group"]),
      rectangle("top"),
    ]);
    act(() => api.bringToFront([api.getSceneElements()[0]]));
    expect(api.getSceneElements().map((element) => element.id)).toEqual([
      "second",
      "top",
      "first",
    ]);
  });

  it("exposes detached upstream methods with group and locked-element options", async () => {
    const { api, selected } = await mount([
      rectangle("first", false, ["group"]),
      rectangle("second", false, ["group"]),
      rectangle("locked", true),
    ]);
    const { select, add, remove, clear } = api.selection;
    act(() => select("first"));
    expect(selected().sort()).toEqual(["first", "second"]);
    act(() => remove("second"));
    expect(selected()).toEqual([]);
    act(() => select("locked"));
    expect(selected()).toEqual([]);
    act(() => add("locked", { includeLocked: true }));
    expect(selected()).toEqual(["locked"]);
    act(() => select("first", { deep: true }));
    expect(selected()).toEqual(["first"]);
    act(() => clear());
    expect(selected()).toEqual([]);
  });

  it("keeps marker frames selectable without changing their saved role", async () => {
    const marker = newFrameElement({ x: 0, y: 0, width: 400, height: 400 });
    const child = { ...rectangle("child"), frameId: marker.id };
    const { api, selected } = await mount([
      { ...marker, frameRole: "marker" },
      child,
    ]);
    act(() => api.selection.select([marker.id, child.id]));
    expect(selected()).toEqual([marker.id]);
    expect(api.getSceneElements()[0]).toMatchObject({ frameRole: "marker" });
    act(() => api.selectElements(api.getSceneElements()));
    expect(selected().sort()).toEqual([marker.id, child.id].sort());
  });

  it("derives the new API's lone-arrow line editor from the selection", async () => {
    const arrow = newLinearElement({
      type: "arrow",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 100)],
    });
    const { api } = await mount([arrow, rectangle("other")]);
    act(() => api.selection.select(arrow.id));
    expect(api.getAppState().selectedLinearElement?.elementId).toBe(arrow.id);
    act(() => api.selection.add("other"));
    expect(api.getAppState().selectedLinearElement).toBeNull();
    act(() => api.selection.remove("other"));
    expect(api.getAppState().selectedLinearElement?.elementId).toBe(arrow.id);
    act(() => api.selection.clear());
    expect(api.getAppState().selectedElementIds).toEqual({});
  });

  it("shows upstream link selection without changing host search highlighting", async () => {
    const { api } = await mount([
      { ...rectangle("linked"), link: "https://obsidian.md" },
      rectangle("other"),
    ]);
    act(() => api.selection.select("linked"));
    expect(api.getAppState().showHyperlinkPopup).toBe("info");
    act(() => api.selection.add("other"));
    expect(api.getAppState().showHyperlinkPopup).toBe(false);
    act(() => api.selectElements([api.getSceneElements()[0]], true));
    expect(api.getAppState().highlightSearchResult).toBe(true);
  });
});
// zsviczian END
