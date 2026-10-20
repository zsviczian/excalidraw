/**
 * Obsidian-specific render contracts across upstream's scoped environments.
 * Author: zsviczian
 * Reference: https://github.com/zsviczian/excalidraw/pull/469
 * Saved custom pens and host link opacity must retain their rendering while
 * every canvas and path is supplied by the requesting editor/export host.
 */
import { RoughCanvas } from "roughjs/bin/canvas";
import { vi } from "vitest";

import { newElement, newFreeDrawElement } from "@excalidraw/element";
import { getFreeDrawSvgPath } from "@excalidraw/element/freedrawPath";
import { pointFrom } from "@excalidraw/math";

import type { RenderEnvironment } from "@excalidraw/element";
import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";
import type { LocalPoint } from "@excalidraw/math";

import { getDefaultAppState } from "../appState";
import { renderStaticScene } from "../renderer/staticScene";

import type { StaticSceneRenderConfig } from "../scene/types";

const createHost = () => {
  const canvases: HTMLCanvasElement[] = [];
  const createPath = vi.fn((path: string) => new Path2D(path));
  const environment: RenderEnvironment = {
    createCanvas: () => {
      const canvas = document.createElement("canvas");
      canvases.push(canvas);
      return canvas;
    },
    createImage: () => {
      const image = document.createElement("img");
      Object.defineProperty(image, "complete", { value: true });
      Object.defineProperty(image, "naturalWidth", { value: 16 });
      return image;
    },
    createPath,
  };
  return { canvases, createPath, environment };
};

const render = (
  elements: NonDeletedExcalidrawElement[],
  environment: RenderEnvironment,
  linkOpacity = 1,
) => {
  const canvas = document.createElement("canvas");
  const map = new Map(elements.map((element) => [element.id, element]));
  const config: StaticSceneRenderConfig = {
    canvas,
    rc: new RoughCanvas(canvas),
    elementsMap: map as StaticSceneRenderConfig["elementsMap"],
    allElementsMap: map as StaticSceneRenderConfig["allElementsMap"],
    visibleElements: elements,
    scale: 1,
    appState: {
      ...getDefaultAppState(),
      linkOpacity,
      width: 800,
      height: 600,
      offsetLeft: 0,
      offsetTop: 0,
    },
    renderConfig: {
      scale: 1,
      renderEnvironment: environment,
      canvasBackgroundColor: "#ffffff",
      imageCache: new Map(),
      renderGrid: false,
      isExporting: false,
      embedsValidationStatus: new Map(),
      elementsPendingErasure: new Set(),
      pendingFlowchartNodes: null,
      theme: "light",
    },
  };
  renderStaticScene(config);
  return canvas;
};

it("preserves custom pen outlines through each host's path factory", () => {
  const pen = newFreeDrawElement({
    type: "freedraw",
    x: 0,
    y: 0,
    strokeColor: "#123456",
    backgroundColor: "#abcdef",
    strokeWidth: 2,
    simulatePressure: true,
    points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(30, 20)],
    customData: { strokeOptions: { hasOutline: true, outlineWidth: 3 } },
  });
  const a = createHost();
  const b = createHost();
  for (const host of [a, b]) {
    render([pen], host.environment);
    expect(host.createPath).toHaveBeenCalledWith(getFreeDrawSvgPath(pen));
    const context = host.canvases[0].getContext("2d")!;
    const stroke = vi.mocked(context.stroke);
    const fill = vi.mocked(context.fill);
    expect(stroke).toHaveBeenCalled();
    expect(fill).toHaveBeenCalledWith(stroke.mock.calls[0][0]);
  }
  expect(a.createPath.mock.results[0].value).not.toBe(
    b.createPath.mock.results[0].value,
  );
});

it("keeps baked link opacity separate when editors share an environment", () => {
  const host = createHost();
  const rectangle = newElement({
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    link: "https://excalidraw.com",
  });
  const icon = (opacity: number) => {
    const canvas = render([rectangle], host.environment, opacity);
    const sources = vi.mocked(canvas.getContext("2d")!.drawImage).mock.calls;
    return sources
      .map(([source]) => source)
      .find(
        (source): source is HTMLCanvasElement =>
          host.canvases.includes(source as HTMLCanvasElement) &&
          (source as HTMLCanvasElement).width < 64,
      )!;
  };
  const faint = icon(0.2);
  const strong = icon(0.8);
  expect(faint).toBeDefined();
  expect(strong).toBeDefined();
  expect(faint).not.toBe(strong);
  expect(faint.getContext("2d")!.globalAlpha).toBe(0.2);
  expect(strong.getContext("2d")!.globalAlpha).toBe(0.8);
  expect(icon(0.2)).toBe(faint);
});
