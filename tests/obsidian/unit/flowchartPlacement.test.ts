/**
 * zsviczian -- #478: exercise upstream placement through real scene/binding
 * modules, independent of the upstream window.h test harness. Keep connected
 * host shapes usable while pending children grow around the parent.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/478
 */
import { expect, it } from "vitest";

import { addNewNodes } from "@excalidraw/element/flowchart";
import {
  newElement,
  syncInvalidIndices,
  isFlowchartNodeElement,
  isArrowElement,
} from "@excalidraw/element";

import { Scene } from "@excalidraw/element/Scene";

import type { LinkDirection } from "@excalidraw/element/flowchart";

import { getDefaultAppState } from "../../../packages/excalidraw/appState";

const state = () => ({
  ...getDefaultAppState(),
  width: 1000,
  height: 1000,
  offsetTop: 0,
  offsetLeft: 0,
});

it.each<LinkDirection>(["right", "left", "up", "down"])(
  "centers growing %s children without losing bindings or host styles",
  (direction) => {
    const parent = newElement({
      type: "rectangle",
      x: 25,
      y: 40,
      width: 200,
      height: 100,
      strokeColor: "#123456",
      strokeWidth: 3,
      opacity: 65,
    });
    if (!isFlowchartNodeElement(parent)) {
      throw Error("Expected a flowchart node");
    }
    const scene = new Scene();
    scene.replaceAllElements(syncInvalidIndices([parent]));
    try {
      let crossStart: number | null = null;
      for (const count of [1, 2, 3]) {
        const result = addNewNodes(
          parent,
          state(),
          direction,
          scene,
          count,
          crossStart,
        );
        crossStart = result.crossStart;
        const nodes = result.nodes.filter((e) => e.type === "rectangle");
        const arrows = result.nodes.filter(isArrowElement);
        expect(nodes).toHaveLength(count);
        expect(arrows).toHaveLength(count);
        const horizontal = direction === "left" || direction === "right";
        const first = nodes[0];
        const last = nodes.at(-1)!;
        const center = horizontal
          ? (first.y + last.y + last.height) / 2
          : (first.x + last.x + last.width) / 2;
        expect(center).toBeCloseTo(
          horizontal
            ? parent.y + parent.height / 2
            : parent.x + parent.width / 2,
        );
        for (let i = 0; i < count; i++) {
          expect(arrows[i].startBinding?.elementId).toBe(parent.id);
          expect(arrows[i].endBinding?.elementId).toBe(nodes[i].id);
          expect(nodes[i]).toMatchObject({
            strokeColor: parent.strokeColor,
            strokeWidth: parent.strokeWidth,
            opacity: parent.opacity,
            width: parent.width,
            height: parent.height,
          });
        }
      }
    } finally {
      scene.destroy();
    }
  },
);

it("keeps a gap below connected children beside the parent's row", () => {
  const parent = newElement({
    type: "rectangle",
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  });
  if (!isFlowchartNodeElement(parent)) {
    throw Error("Expected a flowchart node");
  }
  const scene = new Scene();
  scene.replaceAllElements(syncInvalidIndices([parent]));
  try {
    const children = addNewNodes(parent, state(), "right", scene, 2);
    scene.replaceAllElements(syncInvalidIndices([parent, ...children.nodes]));
    const result = addNewNodes(parent, state(), "down", scene, 2);
    expect(
      result.nodes
        .filter((e) => e.type === "rectangle")
        .map((e) => ({ x: e.x, y: e.y })),
    ).toEqual([
      { x: -300, y: 200 },
      { x: 0, y: 200 },
    ]);
  } finally {
    scene.destroy();
  }
});

it.each([
  { direction: "up" as const, y: -0.1, height: 100 },
  { direction: "down" as const, y: 0.1, height: 100.3 },
])(
  "ignores rounding noise next to a parent's row ($direction)",
  ({ direction, y, height }) => {
    const parent = newElement({
      type: "rectangle",
      x: 0,
      y,
      width: 200,
      height,
    });
    if (!isFlowchartNodeElement(parent)) {
      throw Error("Expected a flowchart node");
    }
    const scene = new Scene();
    scene.replaceAllElements(syncInvalidIndices([parent]));
    try {
      const child = addNewNodes(parent, state(), "right", scene, 1);
      scene.replaceAllElements(syncInvalidIndices([parent, ...child.nodes]));
      const result = addNewNodes(parent, state(), direction, scene, 2);
      expect(
        result.nodes.filter((e) => e.type === "rectangle").map((e) => e.x),
      ).toEqual([-150, 150]);
    } finally {
      scene.destroy();
    }
  },
);
