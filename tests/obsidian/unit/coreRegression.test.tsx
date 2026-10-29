// zsviczian -- #477: protect upstream workflows at fork-modified boundaries.
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import {
  Excalidraw,
  convertToExcalidrawElements,
  restoreElements,
} from "@excalidraw/excalidraw";
import { DEFAULT_SIDEBAR, FONT_FAMILY } from "@excalidraw/common";
import {
  isArrowElement,
  isTextElement,
  newElementWith,
} from "@excalidraw/element";

import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { ExcalidrawElementSkeleton } from "@excalidraw/element/transform";

import { Fonts } from "../../../packages/excalidraw/fonts/Fonts";
import { getCSSFontDefinition } from "../../../packages/excalidraw/obsidianUtils";
import fixtureData from "../fixtures/host-scene.json";

const fixture = fixtureData as {
  skeleton: ExcalidrawElementSkeleton[];
  hostText: { text: string; rawText: string };
  expected: {
    link: string;
    customData: object;
    start: string;
    end: string;
    container: string;
  };
};

afterEach(cleanup);

it("system font CSS uses the local fallback without fetching nonexistent font content", async () => {
  const face = Fonts.registered.get(FONT_FAMILY.Helvetica)!.fontFaces[0];
  const content = vi.spyOn(face, "getContentLegacy");
  const error = vi.spyOn(console, "error");
  try {
    expect(await getCSSFontDefinition(FONT_FAMILY.Helvetica)).toBe("");
    expect(content).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  } finally {
    content.mockRestore();
    error.mockRestore();
  }
});

it("bundled font CSS still embeds the registered font content", async () => {
  const face = Fonts.registered.get(FONT_FAMILY.Excalifont)!.fontFaces[0];
  const data = "data:font/woff2;base64,d29mMg==";
  const content = vi.spyOn(face, "getContentLegacy").mockResolvedValue(data);
  try {
    expect(await getCSSFontDefinition(FONT_FAMILY.Excalifont)).toBe(
      `@font-face {font-family: ${face.fontFace.family}; src: url(${data});}`,
    );
    expect(content).toHaveBeenCalledOnce();
    expect(await getCSSFontDefinition(-1)).toBe("");
  } finally {
    content.mockRestore();
  }
});

it("vault-provided Local Font content remains embedded", async () => {
  const registered = new Map(Fonts.registered);
  const data = "data:font/woff2;base64,bG9jYWw=";
  Fonts.register.call(
    { registered },
    "Local Font",
    {
      metrics: Fonts.registered.get(FONT_FAMILY.Excalifont)!.metadata.metrics,
    },
    { uri: data },
  );
  const face = registered.get(FONT_FAMILY["Local Font"])!.fontFaces[0];
  const content = vi.spyOn(face, "getContentLegacy").mockResolvedValue(data);
  const registry = vi
    .spyOn(Fonts, "registered", "get")
    .mockReturnValue(registered);
  try {
    expect(await getCSSFontDefinition(FONT_FAMILY["Local Font"])).toBe(
      `@font-face {font-family: Local Font; src: url(${data});}`,
    );
    expect(content).toHaveBeenCalledOnce();
  } finally {
    registry.mockRestore();
    content.mockRestore();
  }
});

async function mount(
  elements: readonly ExcalidrawElement[] = [],
  props: ExcalidrawProps = {},
) {
  let api!: ExcalidrawImperativeAPI;
  const rendered = render(
    <Excalidraw
      {...props}
      handleKeyboardGlobally
      initialData={{ elements, appState: { scrollX: 0, scrollY: 0 } }}
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
    />,
  );
  await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
  return { ...rendered, api };
}

function pointer(
  canvas: HTMLCanvasElement,
  type: string,
  x: number,
  y: number,
  button = 0,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button,
    buttons: type === "pointerup" ? 0 : button === 2 ? 2 : 1,
  });
  Object.defineProperties(event, {
    pointerType: { value: "mouse" },
    pointerId: { value: 1 },
  });
  fireEvent(canvas, event);
}

it("hiding default UI preserves pointer authoring after the scheduled activation", async () => {
  const { api, container } = await mount([], { ui: false });
  expect(
    container.querySelector('[data-testid="toolbar-rectangle"]'),
  ).toBeNull();
  act(() => api.setActiveTool({ type: "rectangle" }));
  await waitFor(() =>
    expect(api.getAppState().activeTool.type).toBe("rectangle"),
  );
  const canvas =
    container.querySelector<HTMLCanvasElement>("canvas.interactive")!;
  pointer(canvas, "pointerdown", 30, 30);
  pointer(canvas, "pointermove", 100, 80);
  pointer(canvas, "pointerup", 100, 80);
  await waitFor(() => expect(api.getSceneElements()).toHaveLength(1));
  expect(api.getSceneElements()[0]).toMatchObject({
    type: "rectangle",
    width: 70,
    height: 50,
  });
});

it.each([1, 2])(
  "pan button %s forwards the host pointer-down hook before pan ownership",
  async (button) => {
    const onPointerUpdate = vi.fn();
    const { api, container } = await mount([], { onPointerUpdate });
    const canvas =
      container.querySelector<HTMLCanvasElement>("canvas.interactive")!;
    onPointerUpdate.mockClear();
    pointer(canvas, "pointerdown", 80, 60, button);
    expect(onPointerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ button: "down" }),
    );
    pointer(canvas, "pointermove", 110, 80, button);
    pointer(canvas, "pointerup", 110, 80, button);
    expect(api.getSceneElements()).toHaveLength(0);
  },
);

// The fork intentionally commits tool changes in an owning-window task. Tests
// wait for the public state, without replacing scheduling with a synchronous API.
it.each([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "freedraw",
  "hand",
  "eraser",
  "laser",
  "text",
  "frame",
  "embeddable",
  "stickynote",
  "autoshape",
  "bucketfill",
] as const)(
  "public tool activation commits %s and returns to selection",
  async (type) => {
    const { api } = await mount();
    act(() => api.setActiveTool({ type }));
    await waitFor(() => expect(api.getAppState().activeTool.type).toBe(type));
    act(() => api.setActiveTool({ type: "selection" }));
    await waitFor(() =>
      expect(api.getAppState().activeTool.type).toBe("selection"),
    );
    expect(api.getSceneElements()).toEqual([]);
  },
);

it.each([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "freedraw",
] as const)(
  "toolbar can select %s with real scheduling and one unambiguous control",
  async (type) => {
    const { api, getAllByTestId } = await mount();
    const controls = getAllByTestId(`toolbar-${type}`);
    expect(controls).toHaveLength(1);
    fireEvent.click(controls[0]);
    await waitFor(() => expect(api.getAppState().activeTool.type).toBe(type));
  },
);

it("host-forced tool and scene updates coexist after initialization", async () => {
  let api!: ExcalidrawImperativeAPI;
  const { unmount } = render(
    <Excalidraw
      activeTool={{ type: "rectangle" }}
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
    />,
  );
  await waitFor(() => {
    expect(api?.getAppState().isLoading).toBe(false);
    expect(api?.getAppState().activeTool.type).toBe("rectangle");
  });
  const elements = convertToExcalidrawElements([
    { type: "rectangle", x: 10, y: 20, width: 80, height: 40 },
  ]);
  act(() => api.updateScene({ elements, captureUpdate: "IMMEDIATELY" }));
  expect(api.getSceneElements()).toHaveLength(1);
  expect(api.getAppState().activeTool.type).toBe("rectangle");
  unmount();
});

it("bound host text, links and unknown data survive JSON restore", () => {
  const input = JSON.stringify(fixture);
  const converted = convertToExcalidrawElements(fixture.skeleton, {
    regenerateIds: false,
  });
  const elements = converted.map((element) =>
    isTextElement(element)
      ? newElementWith(element, { rawText: fixture.hostText.rawText })
      : element,
  );
  const restored = restoreElements(JSON.parse(JSON.stringify(elements)), null);
  const left = restored.find((element) => element.id === "left")!;
  const arrow = restored.find(isArrowElement)!;
  const text = restored.find(isTextElement)!;
  expect(left.link).toBe(fixture.expected.link);
  expect(left.customData).toEqual(fixture.expected.customData);
  expect(arrow.startBinding?.elementId).toBe(fixture.expected.start);
  expect(arrow.endBinding?.elementId).toBe(fixture.expected.end);
  expect(text.containerId).toBe(fixture.expected.container);
  expect(text.rawText).toBe(fixture.hostText.rawText);
  expect(text.text).toBe(fixture.hostText.text);
  expect(JSON.stringify(fixture)).toBe(input);
});

it("library updates render independently of the drawing", async () => {
  const elements = convertToExcalidrawElements([
    {
      type: "rectangle",
      id: "library-shape",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      link: "[[Library target]]",
      customData: { fixture: true },
    },
  ]);
  const { api } = await mount();
  await act(async () =>
    api.updateLibrary({
      libraryItems: [
        { id: "owned-item", status: "unpublished", created: 1, elements },
      ],
    }),
  );
  expect(api.getSceneElements()).toEqual([]);
  // The promise is the public persistence boundary; a resolved update must
  // remain usable when opening the library afterwards.
  act(() =>
    api.toggleSidebar({
      name: DEFAULT_SIDEBAR.name,
      tab: DEFAULT_SIDEBAR.defaultTab,
    }),
  );
  await waitFor(() =>
    expect(document.querySelector(".library-unit__dragger")).not.toBeNull(),
  );
  expect(api.getAppState().openSidebar?.name).toBe(DEFAULT_SIDEBAR.name);
});
