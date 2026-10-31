// zsviczian -- explicit upstream-like host preferences for inherited UI tests, fork #477.
import { beforeEach, afterEach } from "vitest";
import { configureObsidianCommonHost } from "@excalidraw/common/commonObsidianHost";
import { configureObsidianExcalidrawHost } from "@excalidraw/excalidraw/obsidianExcalidrawHost";

let disposeCommon: (() => void) | undefined;
let disposeComponent: (() => void) | undefined;
beforeEach(() => {
  disposeCommon = configureObsidianCommonHost({
    protocolVersion: 1,
    getDeviceInfo: () => null,
    getDesktopUIMode: () => "full",
    getPreferredUIMode: (formFactor) =>
      formFactor === "phone" ? "mobile" : "full",
    getCanvasLimits: () => ({ areaLimit: 16777216, widthHeightLimit: 32767 }),
    getHighlightColor: () => "rgba(0,118,255,1)",
  });
  disposeComponent = configureObsidianExcalidrawHost({
    protocolVersion: 4,
    isDoubleTapEraserEnabled: () => false,
    getZoomToFitMaxLevel: () => 10,
    isPenModeCrosshairVisible: () => false,
    isSingleFingerPanningEnabled: () => false,
    isDoubleClickTextEditingDisabled: () => false,
    getZoomStep: () => 0.1,
    getZoomMin: () => 0.1,
    getZoomMax: () => 30,
    isContextMenuDisabled: () => false,
    shouldSyncElementLinkWithText: () => false,
    loadFontFromFile: async () => undefined,
    getMermaid: async () => {
      throw Error(
        "Mermaid is not supplied by the inherited compatibility host",
      );
    },
    runAction: () => {},
    prepareMermaidSVGInsert: async (_editorId, diagram) => diagram,
    getLabel: (key) => key,
    attachInlineLinkSuggester: () => ({
      isBlockingKeys: () => false,
      close() {},
    }),
  });
});
afterEach(() => {
  disposeComponent?.();
  disposeCommon?.();
});
