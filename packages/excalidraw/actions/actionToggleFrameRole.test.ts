/**
 * zsviczian -- Regression coverage for the fork-only marker-frame role.
 *
 * Marker conversion must detach existing frame members in the same history
 * checkpoint so undo can restore both the normal frame and its membership.
 *
 * Author: zsviczian
 * Reference: actionToggleFrameRole in actionProperties.tsx
 */
import { arrayToMap } from "@excalidraw/common";
import {
  CaptureUpdateAction,
  deepCopyElement,
  StoreSnapshot,
  syncInvalidIndicesImmutable,
} from "@excalidraw/element";

import type {
  ExcalidrawFrameElement,
  ExcalidrawGenericElement,
  OrderedExcalidrawElement,
  SceneElementsMap,
} from "@excalidraw/element/types";

import { getDefaultAppState } from "../appState";
import { HistoryDelta } from "../history";
import { rectangleFixture } from "../tests/fixtures/elementFixture";

import { actionToggleFrameRole } from "./actionProperties";

describe("marker frame role", () => {
  it("removes frame members and restores them on undo", async () => {
    const frame = {
      ...rectangleFixture,
      id: "frame",
      type: "frame",
      name: null,
    } as ExcalidrawFrameElement;
    const rectangle = {
      ...rectangleFixture,
      id: "rectangle",
      frameId: frame.id,
    } as ExcalidrawGenericElement;
    const previousElements = syncInvalidIndicesImmutable([rectangle, frame])!;
    const actionElements = Array.from(previousElements.values()).map(
      deepCopyElement,
    ) as OrderedExcalidrawElement[];
    const appState = {
      ...getDefaultAppState(),
      width: 0,
      height: 0,
      offsetLeft: 0,
      offsetTop: 0,
      selectedElementIds: { [frame.id]: true as const },
    };

    const result = await actionToggleFrameRole.perform(
      actionElements,
      appState,
      { frameRole: "marker" },
      null!,
    );

    expect(result.captureUpdate).toBe(CaptureUpdateAction.IMMEDIATELY);
    const nextElements = arrayToMap(
      result.elements as readonly OrderedExcalidrawElement[],
    ) as SceneElementsMap;
    expect(
      (nextElements.get(frame.id) as ExcalidrawFrameElement).frameRole,
    ).toBe("marker");
    expect(nextElements.get(rectangle.id)?.frameId).toBe(null);

    const previousSnapshot = StoreSnapshot.create(previousElements, appState);
    const nextSnapshot = StoreSnapshot.create(nextElements, appState, {
      didElementsChange: true,
      didAppStateChange: false,
    });
    const undoDelta = HistoryDelta.inverse(
      HistoryDelta.calculate(previousSnapshot, nextSnapshot),
    );
    const [undoneElements] = undoDelta.applyTo(
      nextElements,
      appState,
      nextSnapshot,
    );

    expect(
      (undoneElements.get(frame.id) as ExcalidrawFrameElement).frameRole,
    ).not.toBe("marker");
    expect(undoneElements.get(rectangle.id)?.frameId).toBe(frame.id);
  });
});
