/** zsviczian -- live host zoom limits in the actual wheel controller, plugin #3008. */
import { vi } from "vitest";

import type { ObsidianExcalidrawHostAdapter } from "../obsidianExcalidrawHost";

import type { AppState, ScrollConstraints } from "../types";
import type App from "./App";

vi.mock("../reactUtils", () => ({ withBatchedUpdates: (fn: unknown) => fn }));

describe("Obsidian wheel minimum (#3008)", () => {
  let host: typeof import("../obsidianExcalidrawHost");
  let getNormalizedZoom: typeof import("../scene").getNormalizedZoom;
  let constrainScrollState: typeof import("../viewport").constrainScrollState;
  let AppWheel: typeof import("./App.wheel").AppWheel;
  beforeAll(async () => {
    // setupTests loads part of this graph before its common-module mock.
    // Keep the controller and its host registry in one module instance.
    vi.resetModules();
    host = await import("../obsidianExcalidrawHost");
    ({ getNormalizedZoom } = await import("../scene"));
    ({ constrainScrollState } = await import("../viewport"));
    ({ AppWheel } = await import("./App.wheel"));
  });
  let dispose: (() => void) | undefined;
  afterEach(() => {
    dispose?.();
    vi.restoreAllMocks();
  });

  function fixture(
    minimum = 0.01,
    constraints: ScrollConstraints | null = null,
    maximum = 30,
    initialZoom = 0.15,
  ) {
    const readMinimum = vi.fn(() => minimum);
    const readMaximum = vi.fn(() => maximum);
    // Only zoom capabilities are used by this controller/normalizer fixture.
    dispose = host.configureObsidianExcalidrawHost({
      protocolVersion: host.OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
      getZoomMin: readMinimum,
      getZoomMax: readMaximum,
      isDoubleTapEraserEnabled: () => false,
      getZoomToFitMaxLevel: () => 1,
      isPenModeCrosshairVisible: () => false,
      isSingleFingerPanningEnabled: () => false,
      isDoubleClickTextEditingDisabled: () => false,
      getZoomStep: () => 0.05,
      isContextMenuDisabled: () => false,
      shouldSyncElementLinkWithText: () => false,
      loadFontFromFile: async () => undefined,
      getMermaid: async () => ({
        loaded: false,
        api: new Promise<never>(() => {}),
      }),
      runAction: () => {},
      prepareMermaidSVGInsert: async (_editorId, diagram) => diagram,
      getLabel: (key) => key,
      attachInlineLinkSuggester: () => ({
        isBlockingKeys: () => false,
        close: () => {},
      }),
    } as ObsidianExcalidrawHostAdapter);
    let state = {
      zoom: { value: getNormalizedZoom(initialZoom) },
      scrollX: 0,
      scrollY: 0,
      width: 800,
      height: 600,
      allowWheelZoom: true,
      inputDevice: "trackpad",
      scrollConstraints: constraints,
    } as AppState;
    expect(readMinimum()).toBe(minimum);
    expect(getNormalizedZoom(0)).toBe(minimum);
    const reset = vi.fn();
    const app = {
      ownerWindow: window,
      get state() {
        return state;
      },
      isNavigationEnabled: () => true,
      pan: { isActive: () => false },
      resetShouldCacheIgnoreZoomDebounced: reset,
      viewport: {
        lastPosition: { x: 200, y: 150 },
        translate: (update: (state: AppState) => Partial<AppState> | null) => {
          const next = update(state);
          if (!next) {
            return false;
          }
          state = { ...state, ...next };
          state = { ...state, ...constrainScrollState(state) };
          return true;
        },
      },
    };
    const wheel = new AppWheel(app as unknown as App);
    const canvas = document.createElement("canvas");
    const tick = (deltaY: number) => {
      const event = new WheelEvent("wheel", { deltaY });
      Object.defineProperty(event, "target", { value: canvas });
      wheel.handle(event);
    };
    return { tick, readMinimum, readMaximum, reset, state: () => state };
  }

  it("crosses 10%, stops at 1%, and never snaps back on a further zoom-out", () => {
    const f = fixture();
    f.tick(100);
    f.tick(100);
    expect(f.state().zoom.value).toBeCloseTo(0.05);
    f.tick(100);
    expect(f.state().zoom.value).toBe(0.01);
    f.reset.mockClear();
    f.tick(100);
    expect(f.state().zoom.value).toBe(0.01);
    expect(f.reset).not.toHaveBeenCalled();
  });

  it("reads settings live and still allows zoom-in from below 10%", () => {
    const f = fixture();
    for (let i = 0; i < 4; i++) {
      f.tick(100);
    }
    f.tick(-1);
    expect(f.state().zoom.value).toBe(0.02);
    f.readMinimum.mockReturnValue(0.2);
    f.tick(100);
    expect(f.state().zoom.value).toBe(0.2);
  });

  it("retains the standalone 10% default", () => {
    const f = fixture(0.1);
    f.tick(100);
    expect(f.state().zoom.value).toBe(0.1);
  });

  it.each([false, true])(
    "respects scroll constraints with lockZoom=%s",
    (lockZoom) => {
      const f = fixture(0.01, {
        x: 0,
        y: 0,
        width: 10000,
        height: 10000,
        lockScroll: true,
        lockZoom,
        zoom: 0.12,
        overscroll: 0,
      });
      for (let i = 0; i < 4; i++) {
        f.tick(100);
      }
      expect(f.state().zoom.value).toBe(lockZoom ? 0.12 : 0.01);
    },
  );

  it.each([
    null,
    {
      x: 0,
      y: 0,
      width: 10000,
      height: 10000,
      lockScroll: false,
      lockZoom: false,
      zoom: 1,
      overscroll: 0,
    },
  ])(
    "honors live host maximum above and below 3000%% with constraints %j",
    (constraints) => {
      const f = fixture(0.01, constraints, 50, 29.99);
      f.tick(-100);
      expect(f.state().zoom.value).toBeGreaterThan(30);
      for (let i = 0; i < 80; i++) {
        f.tick(-100);
      }
      expect(f.state().zoom.value).toBe(50);
      f.readMaximum.mockReturnValue(20);
      f.tick(-100);
      expect(f.state().zoom.value).toBe(20);
    },
  );
});
