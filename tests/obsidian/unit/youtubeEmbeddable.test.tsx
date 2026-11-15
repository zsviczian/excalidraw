/** zsviczian -- plugin #3048: video providers must retain browser fullscreen and postMessage. */
import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Excalidraw } from "@excalidraw/excalidraw";
import { newEmbeddableElement } from "@excalidraw/element/newElement";
import { configureObsidianCommonHost } from "@excalidraw/common/commonObsidianHost";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const disposers: (() => void)[] = [];
afterEach(() => {
  cleanup();
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});

it.each([
  [
    "https://www.youtube.com/watch?v=abcdefghijk",
    "iframe",
    "https://releases.obsidian.md/youtube?",
  ],
  [
    "https://www.youtube.com/playlist?list=PLabcdefghijk",
    "iframe",
    "https://www.youtube.com/embed/videoseries?",
  ],
  ["https://vimeo.com/123456789", "iframe", "https://player.vimeo.com/video/"],
  ["https://example.com/page", "webview", "https://example.com/page"],
])("desktop host renders %s through %s", async (link, tag, source) => {
  disposers.push(
    configureObsidianCommonHost({
      protocolVersion: 1,
      getDeviceInfo: () => ({
        isDesktop: true,
        isIOS: false,
        isMobile: false,
        isPhone: false,
        isTablet: false,
        isWindows: true,
        isMacOS: false,
        isLinux: false,
        isAndroid: false,
      }),
      getDesktopUIMode: () => "full",
      getPreferredUIMode: () => "full",
      getCanvasLimits: () => ({ areaLimit: 16777216, widthHeightLimit: 32767 }),
      getHighlightColor: () => "#fff",
    }),
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 1000,
    height: 700,
    right: 1000,
    bottom: 700,
    toJSON() {},
  });
  let api!: ExcalidrawImperativeAPI;
  const { container } = render(
    <Excalidraw
      renderWebview
      validateEmbeddable={true}
      onExcalidrawAPI={(value) => {
        if (value) {
          api = value;
        }
      }}
      initialData={{
        elements: [
          newEmbeddableElement({
            type: "embeddable",
            x: 0,
            y: 0,
            width: 480,
            height: 270,
            link,
          }),
        ],
      }}
    />,
  );
  await waitFor(() => expect(api?.getAppState().isLoading).toBe(false));
  act(() => api.setDesktopUIMode("full"));
  await waitFor(() =>
    expect(
      container.querySelector(`${tag}.excalidraw__embeddable`),
    ).not.toBeNull(),
  );
  const embed = container.querySelector(`${tag}.excalidraw__embeddable`)!;
  expect(embed.getAttribute("src")).toContain(source);
  if (tag === "iframe") {
    expect(embed.hasAttribute("allowfullscreen")).toBe(true);
  }
});
