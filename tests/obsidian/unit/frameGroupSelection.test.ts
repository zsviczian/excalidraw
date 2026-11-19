// zsviczian -- frame-drag regression: grouped candidates must not be reselected per member.
import { describe, expect, it } from "vitest";

import { arrayToMap } from "@excalidraw/common";
import { getElementsInResizingFrame } from "@excalidraw/element/frame";
import { selectGroupsFromGivenElements } from "@excalidraw/element/groups";
import { newElement, newFrameElement } from "@excalidraw/element/newElement";

import { getDefaultAppState } from "../../../packages/excalidraw/appState";

const appState = () => ({
  ...getDefaultAppState(),
  width: 1000,
  height: 1000,
  offsetLeft: 0,
  offsetTop: 0,
});

const rectangle = (id: string, groupIds: string[], x = 10) => ({
  ...newElement({
    type: "rectangle",
    groupIds,
    x,
    y: 10,
    width: 10,
    height: 10,
  }),
  id,
});

describe("group selection during frame dragging", () => {
  it("keeps group-membership work linear for a fixed number of large groups", () => {
    let groupReads = 0;
    const elements = Array.from({ length: 400 }, (_, i) => {
      const element = rectangle(`element-${i}`, [`group-${i % 4}`]);
      const groupIds = element.groupIds;
      Object.defineProperty(element, "groupIds", {
        get: () => {
          groupReads++;
          return groupIds;
        },
      });
      return element;
    });
    const frame = newFrameElement({ x: 0, y: 0, width: 100, height: 100 });
    const highlighted = getElementsInResizingFrame(
      [...elements, frame],
      frame,
      appState(),
      arrayToMap([...elements, frame]),
    );
    expect(highlighted.map((element) => element.id).sort()).toEqual(
      elements.map((element) => element.id).sort(),
    );
    expect(groupReads).toBeLessThan(elements.length * 40);
  });

  it("preserves nested group selection inside and outside the edited group", () => {
    const elements = [
      rectangle("a", ["inner", "outer"]),
      rectangle("b", ["inner", "outer"]),
      rectangle("c", ["other", "outer"]),
      rectangle("d", ["other", "outer"]),
    ];
    const state = appState();
    expect(selectGroupsFromGivenElements(elements, state)).toEqual({
      outer: true,
    });
    expect(
      selectGroupsFromGivenElements(elements, {
        ...state,
        editingGroupId: "outer",
      }),
    ).toEqual({ inner: true, other: true });
    expect(state.selectedElementIds).toEqual({});
    expect(state.selectedGroupIds).toEqual({});
  });

  it("does not select singleton or ungrouped candidates", () => {
    const elements = [rectangle("a", ["singleton"]), rectangle("b", [])];
    expect(selectGroupsFromGivenElements(elements, appState())).toEqual({});
    expect(
      selectGroupsFromGivenElements(elements, {
        ...appState(),
        editingGroupId: "singleton",
      }),
    ).toEqual({});
  });

  it("keeps partially enclosed groups out and marker frames from capturing candidates", () => {
    const elements = [
      rectangle("inside", ["group"]),
      rectangle("outside", ["group"], 200),
    ];
    const frame = newFrameElement({ x: 0, y: 0, width: 100, height: 100 });
    const map = arrayToMap([...elements, frame]);
    expect(
      getElementsInResizingFrame([...elements, frame], frame, appState(), map),
    ).toEqual([]);
    expect(
      getElementsInResizingFrame(
        [...elements, frame],
        { ...frame, frameRole: "marker" },
        appState(),
        map,
      ),
    ).toEqual([]);
  });
});
