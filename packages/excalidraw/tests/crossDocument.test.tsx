import React from "react";
import {
  act,
  fireEvent,
  render as renderReact,
  waitFor,
} from "@testing-library/react";
import { vi } from "vitest";

import { FONT_FAMILY, MIME_TYPES } from "@excalidraw/common"; // zsviczian -- migration fixture MIME
import { newImageElement } from "@excalidraw/element"; // zsviczian -- migration fixture

import type { FontFamilyValues, FileId } from "@excalidraw/element/types"; // zsviczian -- migration file identity

import { Excalidraw } from "../index";
import { useColorTopPicksDnD } from "../components/ColorPicker/colorTopPicksDnD";
import { Tooltip } from "../components/Tooltip"; // zsviczian -- owner-document regression

import type {
  ExcalidrawImperativeAPI,
  BinaryFileData,
  DataURL,
} from "../types"; // zsviczian -- migration fixture

const mountEditorInOwnDocument = (currentItemFontFamily?: FontFamilyValues) => {
  const iframe = document.createElement("iframe");
  document.body.append(iframe);

  const ownerDocument = iframe.contentDocument!;
  const ownerWindow = iframe.contentWindow! as Window & typeof globalThis;
  const mountNode = ownerDocument.createElement("div");
  ownerDocument.body.append(mountNode);

  const fonts = {
    load: vi.fn().mockResolvedValue([]),
    // pretend nothing is loaded yet, so that the editor actually goes
    // through `fonts.load()` for its scene & current item fonts
    check: vi.fn().mockReturnValue(false),
    has: vi.fn().mockReturnValue(true),
    add: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(ownerDocument, "fonts", { value: fonts });
  Object.defineProperties(ownerWindow, {
    addEventListener: { value: vi.fn() },
    removeEventListener: { value: vi.fn() },
    requestAnimationFrame: {
      value: window.requestAnimationFrame.bind(window),
    },
    ResizeObserver: { value: window.ResizeObserver },
  });
  Object.defineProperty(ownerDocument, "defaultView", { value: ownerWindow });
  Object.defineProperty(ownerWindow.HTMLCanvasElement.prototype, "getContext", {
    value: window.HTMLCanvasElement.prototype.getContext,
  });

  let api: ExcalidrawImperativeAPI | null = null;
  const { container, unmount } = renderReact(
    <Excalidraw
      ownerDocument={ownerDocument}
      initialData={{
        appState: currentItemFontFamily ? { currentItemFontFamily } : undefined,
      }}
      onExcalidrawAPI={(nextApi) => {
        api = nextApi;
      }}
    />,
    { container: mountNode, baseElement: ownerDocument.body },
  );

  return {
    fonts,
    container,
    getAPI: () => api,
    cleanup: () => {
      unmount();
      iframe.remove();
    },
  };
};

describe("cross-document rendering", () => {
  it("binds top-picks drag interactions to the source window", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const ownerDocument = iframe.contentDocument!;
    const ownerWindow = iframe.contentWindow!;
    const mountNode = ownerDocument.createElement("div");
    ownerDocument.body.append(mountNode);
    const ownerAddEventListener = vi.fn();
    Object.defineProperties(ownerWindow, {
      addEventListener: { value: ownerAddEventListener },
      removeEventListener: { value: vi.fn() },
    });
    let startPickDrag:
      | ReturnType<typeof useColorTopPicksDnD>["startPickDrag"]
      | null = null;

    const Harness = () => {
      const drag = useColorTopPicksDnD({
        enabled: true,
        picks: ["#000000", "#ffffff"],
        onPicksChange: vi.fn(),
      });
      startPickDrag = drag.startPickDrag;
      return (
        <div ref={drag.setStripEl}>
          <button data-top-pick-index="0" />
          <button data-top-pick-index="1" />
        </div>
      );
    };

    const renderResult = renderReact(<Harness />, {
      container: mountNode,
      baseElement: ownerDocument.body,
    });
    const mainAddEventListener = vi.spyOn(window, "addEventListener");

    try {
      const sourceEl = ownerDocument.querySelector<HTMLElement>(
        "[data-top-pick-index='0']",
      )!;
      act(() =>
        startPickDrag!(
          {
            button: 0,
            pointerId: 1,
            clientX: 0,
            clientY: 0,
            currentTarget: sourceEl,
          } as unknown as React.PointerEvent,
          0,
          "#000000",
        ),
      );

      for (const eventName of [
        "pointermove",
        "pointerup",
        "pointercancel",
        "keydown",
      ]) {
        expect(ownerAddEventListener).toHaveBeenCalledWith(
          eventName,
          expect.any(Function),
          true,
        );
        expect(mainAddEventListener).not.toHaveBeenCalledWith(
          eventName,
          expect.any(Function),
          true,
        );
      }
    } finally {
      renderResult.unmount();
      mainAddEventListener.mockRestore();
      iframe.remove();
    }
  });

  it("scopes listeners, fonts, and portals to ownerDocument", async () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);

    const ownerDocument = iframe.contentDocument!;
    const ownerWindow = iframe.contentWindow! as Window & typeof globalThis;
    const mountNode = ownerDocument.createElement("div");
    ownerDocument.body.append(mountNode);

    const fonts = {
      load: vi.fn().mockResolvedValue([]),
      check: vi.fn().mockReturnValue(true),
      has: vi.fn().mockReturnValue(true),
      add: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(ownerDocument, "fonts", { value: fonts });
    const addEventListener = vi.fn();
    Object.defineProperties(ownerWindow, {
      addEventListener: { value: addEventListener },
      removeEventListener: { value: vi.fn() },
      requestAnimationFrame: {
        value: window.requestAnimationFrame.bind(window),
      },
      ResizeObserver: { value: window.ResizeObserver },
    });
    Object.defineProperty(ownerDocument, "defaultView", {
      value: ownerWindow,
    });
    Object.defineProperty(
      ownerWindow.HTMLCanvasElement.prototype,
      "getContext",
      {
        value: window.HTMLCanvasElement.prototype.getContext,
      },
    );
    const addDocumentEventListener = vi.spyOn(
      ownerDocument,
      "addEventListener",
    );
    let unmount: (() => void) | null = null;
    try {
      let api: ExcalidrawImperativeAPI | null = null;
      const renderResult = renderReact(
        <Excalidraw
          ownerDocument={ownerDocument}
          handleKeyboardGlobally={true}
          onExcalidrawAPI={(nextApi) => {
            api = nextApi;
          }}
        />,
        { container: mountNode, baseElement: ownerDocument.body },
      );
      unmount = renderResult.unmount;
      const { container } = renderResult;

      await waitFor(() =>
        expect(container.querySelector("canvas.interactive")).not.toBeNull(),
      );
      expect(api).not.toBeNull();
      await waitFor(() => expect(api!.getAppState().isLoading).toBe(false));
      expect(
        addDocumentEventListener.mock.calls.some(
          ([eventName]) => eventName === "pointermove",
        ),
      ).toBe(true);
      expect(
        addDocumentEventListener.mock.calls.some(
          ([eventName]) => eventName === "keydown",
        ),
      ).toBe(true);
      expect(
        addDocumentEventListener.mock.calls.some(
          ([eventName]) => eventName === "paste",
        ),
      ).toBe(true);
      expect(
        addEventListener.mock.calls.some(
          ([eventName]) => eventName === "message",
        ),
      ).toBe(true);
      const messageHandler = addEventListener.mock.calls.find(
        ([eventName]) => eventName === "message",
      )?.[1] as EventListener | undefined;
      expect(typeof messageHandler).toBe("function");
      expect(() =>
        messageHandler!(
          new ownerWindow.MessageEvent("message", {
            data: JSON.stringify({ method: "paused", value: true }),
            origin: "https://player.vimeo.com",
          }),
        ),
      ).not.toThrow();

      const excalidrawContainer = container.querySelector(".excalidraw")!;
      fireEvent.pointerEnter(excalidrawContainer);
      expect(ownerDocument.documentElement.style.overscrollBehaviorX).toBe(
        "none",
      );
      fireEvent.pointerLeave(excalidrawContainer);
      expect(ownerDocument.documentElement.style.overscrollBehaviorX).toBe(
        "auto",
      );

      expect(fonts.addEventListener).toHaveBeenCalledWith(
        "loadingdone",
        expect.any(Function),
        { passive: false },
      );

      ownerDocument.body.classList.add("excalidraw-animations-disabled");
      act(() => {
        api!.updateScene({
          appState: { openDialog: { name: "imageExport" } },
        });
      });

      await waitFor(() =>
        expect(
          ownerDocument.querySelector(".excalidraw-modal-container"),
        ).not.toBeNull(),
      );
      expect(document.querySelector(".excalidraw-modal-container")).toBeNull();
      expect(ownerDocument.querySelector(".Modal")).toHaveClass(
        "animations-disabled",
      );
    } finally {
      unmount?.();
      iframe.remove();
    }
  });

  it("loads each editor's current item font through its own ownerDocument.fonts", async () => {
    const defaultFontEditor = mountEditorInOwnDocument();
    const nunitoEditor = mountEditorInOwnDocument(FONT_FAMILY.Nunito);

    try {
      for (const editor of [defaultFontEditor, nunitoEditor]) {
        await waitFor(() =>
          expect(
            editor.container.querySelector("canvas.interactive"),
          ).not.toBeNull(),
        );
        await waitFor(() =>
          expect(editor.getAPI()!.getAppState().isLoading).toBe(false),
        );
      }

      // each editor prewarms its own current item font (the default one
      // included) through its own document's font faces
      await waitFor(() =>
        expect(defaultFontEditor.fonts.load).toHaveBeenCalledWith(
          expect.stringContaining("Excalifont"),
          expect.stringContaining("Excalidr"),
        ),
      );
      await waitFor(() =>
        expect(nunitoEditor.fonts.load).toHaveBeenCalledWith(
          expect.stringContaining("Nunito"),
          expect.stringContaining("Excalidr"),
        ),
      );

      // ...and never through the other document's
      expect(defaultFontEditor.fonts.load).not.toHaveBeenCalledWith(
        expect.stringContaining("Nunito"),
        expect.anything(),
      );
      expect(nunitoEditor.fonts.load).not.toHaveBeenCalledWith(
        expect.stringContaining("Excalifont"),
        expect.anything(),
      );
    } finally {
      nunitoEditor.cleanup();
      defaultFontEditor.cleanup();
    }
  });
  // zsviczian START -- keep tooltip nodes and viewport ownership in the trigger document
  it("renders tooltips in the trigger document", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const ownerDocument = iframe.contentDocument!;
    const mountNode = ownerDocument.createElement("div");
    ownerDocument.body.append(mountNode);

    try {
      const renderResult = renderReact(
        <Tooltip label="Owner document tooltip">
          <span>Tooltip trigger</span>
        </Tooltip>,
        { container: mountNode, baseElement: ownerDocument.body },
      );
      fireEvent.pointerEnter(
        renderResult.getByText("Tooltip trigger").parentElement!,
      );

      expect(
        ownerDocument.querySelector(".excalidraw-tooltip")?.textContent,
      ).toBe("Owner document tooltip");
      expect(document.querySelector(".excalidraw-tooltip")).toBeNull();
      renderResult.unmount();
    } finally {
      iframe.remove();
    }
  });
  // zsviczian END

  // zsviczian START -- keep the Obsidian migration decode boundary in a focused test that runs in this fork
  it("awaits image decoding started by addFiles", async () => {
    let api: ExcalidrawImperativeAPI | null = null;
    const renderResult = renderReact(
      <Excalidraw
        onExcalidrawAPI={(nextApi) => {
          api = nextApi;
        }}
      />,
    );
    const NativeImage = window.Image;
    const pendingImages: HTMLImageElement[] = [];
    try {
      await waitFor(() => expect(api).not.toBeNull());
      await waitFor(() => expect(api!.getAppState().isLoading).toBe(false));

      const fileId = "migration-image" as FileId;
      act(() => {
        api!.updateScene({
          elements: [
            newImageElement({
              type: "image",
              x: 0,
              y: 0,
              fileId,
              status: "saved",
              scale: [1, 1],
            }),
          ],
        });
      });
      vi.stubGlobal(
        "Image",
        class extends NativeImage {
          constructor() {
            super();
            pendingImages.push(this);
          }
        },
      );
      const file: BinaryFileData = {
        id: fileId,
        dataURL: `data:${MIME_TYPES.png};base64,AA==` as DataURL,
        mimeType: MIME_TYPES.png,
        created: Date.now(),
        lastRetrieved: Date.now(),
      };

      act(() => api!.addFiles([file]));
      // zsviczian -- upstream also prewarms link icons; await the scene file, not incidental image factories
      const sceneImages = pendingImages.filter(
        (image) => image.src === file.dataURL,
      );
      expect(sceneImages).toHaveLength(1);
      let settled = false;
      const waitForImages = api!.awaitImageFiles([fileId]).then(() => {
        settled = true;
      });
      await Promise.resolve();
      expect(settled).toBe(false);

      await act(async () => {
        sceneImages[0].onload?.(new Event("load"));
        await waitForImages;
      });
      expect(settled).toBe(true);
      expect(api!.getFiles()[fileId]).toBe(file);
    } finally {
      renderResult.unmount();
      vi.unstubAllGlobals();
    }
  });
  // zsviczian END
  // zsviczian START -- retain document-local tooltip lifetime under a shared runtime, PR #469
  it("does not hide a popout tooltip when a main-document trigger leaves or unmounts", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const doc = iframe.contentDocument!;
    const mount = doc.createElement("div");
    doc.body.append(mount);
    const main = renderReact(
      <Tooltip label="Main">
        <span>Main trigger</span>
      </Tooltip>,
    );
    const popout = renderReact(
      <Tooltip label="Popout">
        <span>Popout trigger</span>
      </Tooltip>,
      { container: mount, baseElement: doc.body },
    );
    try {
      const mainTrigger = main.getByText("Main trigger").parentElement!;
      const popoutTrigger = popout.getByText("Popout trigger").parentElement!;
      fireEvent.pointerEnter(mainTrigger);
      fireEvent.pointerEnter(popoutTrigger);
      expect(doc.querySelector(".excalidraw-tooltip")).toHaveClass(
        "excalidraw-tooltip--visible",
      );
      fireEvent.pointerLeave(mainTrigger);
      main.unmount();
      expect(doc.querySelector(".excalidraw-tooltip")).toHaveClass(
        "excalidraw-tooltip--visible",
      );
      fireEvent.pointerLeave(popoutTrigger);
      expect(doc.querySelector(".excalidraw-tooltip")).not.toHaveClass(
        "excalidraw-tooltip--visible",
      );
    } finally {
      main.unmount();
      popout.unmount();
      iframe.remove();
    }
  });
  // zsviczian END
});
