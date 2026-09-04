import React from "react";
import { createPortal } from "react-dom";

import { act, render } from "@testing-library/react";
import { vi } from "vitest";

import { ObsidianRadixPortal } from "./ObsidianRadixPortal";

const TestPortal = ({
  children,
  container,
}: React.PropsWithChildren<{ container?: HTMLElement }>) =>
  createPortal(children, container ?? document.body);

describe("ObsidianRadixPortal", () => {
  it("portals outside the Excalidraw container while preserving its theme", () => {
    const popoutDocument = document.implementation.createHTMLDocument();
    const container = popoutDocument.createElement("div");
    container.className = "excalidraw theme--dark";
    container.style.setProperty("--island-bg-color", "#232329");
    popoutDocument.body.append(container);

    render(
      <ObsidianRadixPortal portal={TestPortal} container={container}>
        <div data-testid="content" />
      </ObsidianRadixPortal>,
    );

    const content = popoutDocument.querySelector(
      '[data-testid="content"]',
    ) as HTMLElement;
    const bridge = content.parentElement;

    expect(container.contains(content)).toBe(false);
    expect(bridge?.parentElement).toBe(popoutDocument.body);
    expect(bridge?.className).toBe("excalidraw theme--dark");
    expect(bridge?.style.display).toBe("contents");
    expect(bridge?.style.getPropertyValue("--island-bg-color")).toBe("#232329");
  });

  it("keeps content mounted while mirroring source-container visibility", () => {
    let resizeCallback: ResizeObserverCallback | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserverMock {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }

        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const wrapper = document.createElement("div");
    const container = document.createElement("div");
    const getClientRects = vi
      .spyOn(container, "getClientRects")
      .mockReturnValue([{}] as unknown as DOMRectList);
    wrapper.append(container);
    document.body.append(wrapper);
    let unmount: (() => void) | undefined;

    try {
      ({ unmount } = render(
        <ObsidianRadixPortal portal={TestPortal} container={container}>
          <div data-testid="persistent-content" />
        </ObsidianRadixPortal>,
      ));

      const content = document.querySelector(
        '[data-testid="persistent-content"]',
      ) as HTMLElement;
      const bridge = content.parentElement;

      expect(bridge?.style.display).toBe("contents");

      act(() => {
        getClientRects.mockReturnValue([] as unknown as DOMRectList);
        wrapper.style.display = "none";
        resizeCallback?.([], {} as ResizeObserver);
      });
      expect(bridge?.style.display).toBe("none");
      expect(document.body.contains(content)).toBe(true);

      act(() => {
        getClientRects.mockReturnValue([{}] as unknown as DOMRectList);
        wrapper.style.removeProperty("display");
        resizeCallback?.([], {} as ResizeObserver);
      });
      expect(bridge?.style.display).toBe("contents");
      const restoredContent = document.querySelector(
        '[data-testid="persistent-content"]',
      );
      expect(restoredContent).toBe(content);
    } finally {
      unmount?.();
      getClientRects.mockRestore();
      wrapper.remove();
      vi.unstubAllGlobals();
    }
  });
});
