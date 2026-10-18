/**
 * zsviczian -- PR #468 public export and marker/palette regression coverage.
 * Avoid the upstream window.h test harness; exercise the real export pipeline.
 * https://github.com/zsviczian/excalidraw/pull/468
 */
import { newElement, newFrameElement } from "@excalidraw/element";
import { vi } from "vitest";

import { getDefaultAppState } from "../appState";
import * as clipboard from "../clipboard";
import { exportScene } from "../scene/export";
import { decodeSvgBase64Payload } from "../scene/export";
import * as canvasRenderer from "../renderer/staticScene";
import * as svgRenderer from "../renderer/staticSvgScene";
import {
  exportToCanvas,
  exportToSvg,
  exportToBlob,
  exportToClipboard,
} from "../obsidianExport";

const rectangle = () =>
  newElement({
    type: "rectangle",
    x: 20,
    y: 30,
    width: 100,
    height: 50,
    backgroundColor: "#ff0000",
    fillStyle: "solid",
    roughness: 0,
  });
const data = () => ({ elements: [rectangle()], files: {} });

afterEach(() => vi.restoreAllMocks());

it("retains the public root and utility exports", async () => {
  const root = await import("../index");
  const utils = await import("@excalidraw/utils");
  for (const api of [root, utils]) {
    expect(api.exportScene).toBe(exportScene);
    expect(api.exportToCanvas).toBe(exportToCanvas);
    expect(api.exportToSvg).toBe(exportToSvg);
    expect(api.exportToBlob).toBe(exportToBlob);
    expect(api.exportToClipboard).toBe(exportToClipboard);
  }
});

it("preserves legacy raster scale defaults and native dimension truncation", async () => {
  const canvas = await exportToCanvas({
    ...data(),
    appState: { exportScale: 3 },
    exportPadding: 5.3,
  });
  expect([canvas.width, canvas.height]).toEqual([110, 60]);
  const next = await exportScene({
    type: "canvas",
    data: data(),
    config: { padding: 5.3 },
  });
  expect([next.width, next.height]).toEqual([111, 61]);
});

it("preserves independent getDimensions viewport and drawing scale", async () => {
  const render = vi.spyOn(canvasRenderer, "renderStaticScene");
  const getDimensions = vi.fn(() => ({ width: 333.9, height: 77.9, scale: 2 }));
  const canvas = await exportToCanvas({
    ...data(),
    exportPadding: 10,
    getDimensions,
  });
  expect(getDimensions).toHaveBeenCalledWith(120, 70);
  expect([canvas.width, canvas.height]).toEqual([333, 77]);
  expect(render.mock.lastCall![0].scale).toBe(2);
  expect(render.mock.lastCall![0].appState.scrollX).toBe(-10);
});

it("preserves capped raster dimensions and the uncapped exportScale fallback", async () => {
  const getDimensions = vi.fn();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const capped = await exportToCanvas({
    ...data(),
    maxWidthOrHeight: 60,
    getDimensions,
    appState: { exportScale: 3 },
  });
  expect([capped.width, capped.height]).toEqual([60, 35]);
  expect(getDimensions).not.toHaveBeenCalled();
  const uncapped = await exportToCanvas({
    ...data(),
    maxWidthOrHeight: 200,
    appState: { exportScale: 2 },
  });
  expect([uncapped.width, uncapped.height]).toEqual([240, 140]);
});

it("preserves SVG scale, transparent background, links, and embedded scene IDs", async () => {
  const element = {
    ...rectangle(),
    id: "linked01",
    link: "https://example.com",
  };
  const svg = await exportToSvg({
    elements: [element],
    files: {},
    exportPadding: 10,
    appState: {
      exportScale: 2,
      exportBackground: false,
      exportEmbedScene: true,
    },
    skipInliningFonts: true,
  });
  expect(svg.getAttribute("width")).toBe("240");
  expect(svg.getAttribute("height")).toBe("140");
  expect(svg.getAttribute("viewBox")).toBe("0 0 120 70");
  expect(svg.querySelector("a")?.getAttribute("href")).toBe(
    "https://example.com",
  );
  expect(svg.querySelector(":scope > rect")).toBeNull();
  const scene = JSON.parse(decodeSvgBase64Payload({ svg: svg.outerHTML }));
  expect(scene.elements[0].id).toBe(element.id);
});

it("excludes PDF markers before canvas/SVG bounds and embedded SVG metadata", async () => {
  const marker = newFrameElement({
    x: -500,
    y: -500,
    width: 1000,
    height: 1000,
    frameRole: "marker",
  });
  const elements = [rectangle(), marker];
  const canvas = await exportToCanvas({ elements, files: {} });
  expect([canvas.width, canvas.height]).toEqual([120, 70]);
  const svg = await exportToSvg({
    elements,
    files: {},
    appState: { exportEmbedScene: true },
    skipInliningFonts: true,
  });
  expect(svg.getAttribute("width")).toBe("120");
  expect(svg.querySelector(`clipPath[id="${marker.id}"]`)).toBeNull();
  const scene = JSON.parse(decodeSvgBase64Payload({ svg: svg.outerHTML }));
  expect(scene.elements.map((element: { id: string }) => element.id)).toEqual([
    elements[0].id,
  ]);
});

it("preserves the global frame palette, disabled decorations and custom label color", async () => {
  const frame = newFrameElement({
    x: 20,
    y: 30,
    width: 100,
    height: 100,
    name: "Frame",
    customData: { frameColor: { nameColor: "#ff0000" } },
  });
  const appState = {
    ...getDefaultAppState(),
    frameColor: {
      stroke: "#00ff00",
      fill: "transparent",
      nameColor: "#0000ff",
    },
    frameRendering: { ...getDefaultAppState().frameRendering, enabled: false },
  };
  const canvas = vi.spyOn(canvasRenderer, "renderStaticScene");
  const svg = vi.spyOn(svgRenderer, "renderSceneToSvg");
  await exportToCanvas({ elements: [frame], files: {}, appState });
  expect(canvas.mock.lastCall![0].appState.frameColor).toEqual(
    appState.frameColor,
  );
  expect(canvas.mock.lastCall![0].appState.frameRendering).toMatchObject({
    name: false,
    outline: false,
    clip: false,
    markerEnabled: false,
  });
  await exportToSvg({
    elements: [frame],
    files: {},
    appState,
    skipInliningFonts: true,
  });
  expect(svg.mock.lastCall![5].frameColor).toEqual(appState.frameColor);
  await exportToSvg({
    elements: [frame],
    files: {},
    appState: {
      ...appState,
      frameRendering: { ...appState.frameRendering, enabled: true },
    },
    skipInliningFonts: true,
  });
  const label = svg.mock.lastCall![0].find(
    (element) => element.type === "text",
  )!;
  expect(label).toMatchObject({
    text: "Frame",
    rawText: "Frame",
    strokeColor: "#ff0000",
  });
});

it("uses the single-frame region with square clipping through the legacy adapter", async () => {
  const frame = newFrameElement({ x: 0, y: 0, width: 200, height: 100 });
  const render = vi.spyOn(canvasRenderer, "renderStaticScene");
  const canvas = await exportToCanvas({
    ...data(),
    exportingFrame: frame,
    exportPadding: 30,
  });
  expect([canvas.width, canvas.height]).toEqual([200, 100]);
  expect(render.mock.lastCall![0].renderConfig.clipToFrame?.id).toBe(frame.id);
});

it("preserves JPEG alias/background/quality and PNG encoding", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((callback, type) =>
      callback(new Blob(["image"], { type })),
    );
  expect((await exportToBlob({ ...data() })).type).toBe("image/png");
  expect(
    (await exportToBlob({ ...data(), mimeType: "image/jpg", quality: 0.5 }))
      .type,
  ).toBe("image/jpeg");
  expect(toBlob.mock.lastCall?.slice(1)).toEqual(["image/jpeg", 0.5]);
});

it("accepts both clipboard option shapes", async () => {
  const copy = vi
    .spyOn(clipboard, "copyTextToSystemClipboard")
    .mockResolvedValue();
  await exportToClipboard({ type: "svg", ...data() });
  await exportToClipboard({ type: "svg", data: data() });
  expect(copy).toHaveBeenCalledTimes(2);
  expect(
    copy.mock.calls.every(
      ([text]) => typeof text === "string" && text.includes("<svg"),
    ),
  ).toBe(true);
});
