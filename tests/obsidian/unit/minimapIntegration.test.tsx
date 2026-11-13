/**
 * zsviczian -- PR #483: exercise actual fork editors at the new upstream
 * minimap/zoom boundary. Host preferences and limits remain live capabilities.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/483
 */
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
} from "@excalidraw/excalidraw";
import { configureObsidianCommonHost } from "@excalidraw/common/commonObsidianHost";
import { configureObsidianExcalidrawHost } from "@excalidraw/excalidraw/obsidianExcalidrawHost";

import type { StylesPanelMode } from "@excalidraw/common";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";

import { getNormalizedZoom } from "../../../packages/excalidraw/scene";
import { actionToggleMinimap } from "../../../packages/excalidraw/actions";
import { cleanAppStateForExport } from "../../../packages/excalidraw/appState";

const disposers: (() => void)[] = [];
let selectedMode: StylesPanelMode = "full";
afterEach(() => {
  cleanup();
  disposers
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
  vi.restoreAllMocks();
});

function preferences(mode: StylesPanelMode) {
  selectedMode = mode;
  disposers.push(
    configureObsidianCommonHost({
      protocolVersion: 1,
      getDeviceInfo: () => null,
      getDesktopUIMode: () => mode,
      getPreferredUIMode: () => mode,
      getCanvasLimits: () => ({ areaLimit: 16777216, widthHeightLimit: 32767 }),
      getHighlightColor: () => "#fff",
    }),
  );
}

function limits(min = 0.2, max = 5) {
  const live = { min, max };
  disposers.push(
    configureObsidianExcalidrawHost({
      protocolVersion: 4,
      isDoubleTapEraserEnabled: () => false,
      getZoomToFitMaxLevel: () => 10,
      isPenModeCrosshairVisible: () => false,
      isSingleFingerPanningEnabled: () => false,
      isDoubleClickTextEditingDisabled: () => false,
      getZoomStep: () => 0.1,
      getZoomMin: () => live.min,
      getZoomMax: () => live.max,
      isContextMenuDisabled: () => false,
      shouldSyncElementLinkWithText: () => false,
      loadFontFromFile: async () => undefined,
      getMermaid: async () => {
        throw Error("Minimap must not load Mermaid");
      },
      runAction: () => {},
      prepareMermaidSVGInsert: async (_id, diagram) => diagram,
      getLabel: (key) => key,
      attachInlineLinkSuggester: () => ({
        isBlockingKeys: () => false,
        close() {},
      }),
    }),
  );
  return live;
}

async function mount(props: ExcalidrawProps = {}, height = 700) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 1000,
    height,
    right: 1000,
    bottom: height,
    toJSON() {},
  });
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(200);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(140);
  let api!: ExcalidrawImperativeAPI;
  const result = render(
    <Excalidraw
      {...props}
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
      initialData={{
        elements: convertToExcalidrawElements([
          { type: "rectangle", x: 0, y: 0, width: 4000, height: 2800 },
        ]),
        appState: {
          scrollX: 0,
          scrollY: 0,
          zoom: { value: getNormalizedZoom(1) },
        },
      }}
    />,
  );
  await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
  act(() => api.setDesktopUIMode(selectedMode));
  return { ...result, api };
}

it.each(["full", "compact", "tray"] as const)(
  "%s layout toggles and renders the minimap and cleans its subscriptions",
  async (mode) => {
    preferences(mode);
    const { container, api, unmount } = await mount();
    const toggle = container.querySelector('[data-testid="button-minimap"]')!;
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle);
    expect(api.getAppState().minimapEnabled).toBe(true);
    await waitFor(() =>
      expect(container.querySelector(".minimap__canvas")).not.toBeNull(),
    );
    if (mode === "tray") {
      expect(
        container.querySelector(".tray-zoom .minimap__canvas"),
      ).not.toBeNull();
    }
    expect(cleanAppStateForExport(api.getAppState())).not.toHaveProperty(
      "minimapEnabled",
    );
    // Scene may be destroyed before the minimap's cleanup during migration.
    const scene = window.h.app.scene;
    scene.destroy();
    expect(() => unmount()).not.toThrow();
  },
);

it.each([
  false,
  { disabled: { minimap: true } },
  { enabled: { zoom: true } },
] as const)(
  "UI %j cannot expose a dead minimap toggle in tray mode",
  async (ui) => {
    preferences("tray");
    const { container, api } = await mount({ ui });
    expect(
      container.querySelector('[data-testid="button-minimap"]'),
    ).toBeNull();
    expect(
      window.h.app.actionManager.isActionEnabled(actionToggleMinimap),
    ).toBe(false);
    act(() => api.updateScene({ appState: { minimapEnabled: true } }));
    expect(container.querySelector(".minimap")).toBeNull();
    if (ui) {
      expect(container.querySelector(".reset-zoom-button")).not.toBeNull();
    }
  },
);

it("short editors and the host mobile layout cannot enable the minimap", async () => {
  preferences("full");
  const short = await mount({}, 499);
  expect(
    short.container.querySelector('[data-testid="button-minimap"]'),
  ).toBeNull();
  short.unmount();
  preferences("mobile");
  const mobile = await mount();
  expect(
    mobile.container.querySelector('[data-testid="button-minimap"]'),
  ).toBeNull();
  expect(window.h.app.actionManager.isActionEnabled(actionToggleMinimap)).toBe(
    false,
  );
});

it("zoom menu honors host limits, including live values beyond upstream's range", async () => {
  preferences("full");
  const live = limits();
  const { container, api } = await mount();
  const open = () =>
    fireEvent.click(
      container.querySelector('[data-testid="zoom-menu-trigger"]')!,
    );
  act(() =>
    api.updateScene({ appState: { zoom: { value: getNormalizedZoom(5) } } }),
  );
  open();
  await waitFor(() =>
    expect(
      document.querySelector('[data-testid="zoom-menu-zoomIn"]'),
    ).not.toBeNull(),
  );
  expect(
    document.querySelector('[data-testid="zoom-menu-zoomIn"]'),
  ).toBeDisabled();
  live.max = 50;
  act(() =>
    api.updateScene({ appState: { zoom: { value: getNormalizedZoom(30) } } }),
  );
  expect(
    document.querySelector('[data-testid="zoom-menu-zoomIn"]'),
  ).not.toBeDisabled();
  act(() =>
    api.updateScene({ appState: { zoom: { value: getNormalizedZoom(0.2) } } }),
  );
  expect(
    document.querySelector('[data-testid="zoom-menu-zoomOut"]'),
  ).toBeDisabled();
  live.min = 0.01;
  act(() =>
    api.updateScene({ appState: { zoom: { value: getNormalizedZoom(0.1) } } }),
  );
  expect(
    document.querySelector('[data-testid="zoom-menu-zoomOut"]'),
  ).not.toBeDisabled();
});

it("minimap wheel zoom retains viewport center and live host limits", async () => {
  preferences("tray");
  const live = limits();
  const { container, api } = await mount();
  fireEvent.click(container.querySelector('[data-testid="button-minimap"]')!);
  await waitFor(() =>
    expect(container.querySelector(".minimap__canvas")).not.toBeNull(),
  );
  const map = container.querySelector(".minimap")!;
  const center = () => {
    const s = api.getAppState();
    return {
      x: s.width / (2 * s.zoom.value) - s.scrollX,
      y: s.height / (2 * s.zoom.value) - s.scrollY,
    };
  };
  const before = center();
  fireEvent.wheel(map, { deltaY: -100 });
  await waitFor(() => expect(api.getAppState().zoom.value).toBeGreaterThan(1));
  expect(center().x).toBeCloseTo(before.x);
  expect(center().y).toBeCloseTo(before.y);
  live.max = api.getAppState().zoom.value;
  fireEvent.wheel(map, { deltaY: -100 });
  expect(api.getAppState().zoom.value).toBe(live.max);
});
