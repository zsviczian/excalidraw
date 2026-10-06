/**
 * zsviczian -- PR #458 selection-extraction regression coverage.
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

import { newElement } from "@excalidraw/element";

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

async function mount(elements: ReturnType<typeof rectangle>[]) {
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
