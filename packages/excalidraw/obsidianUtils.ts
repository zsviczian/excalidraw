import { GlobalPoint } from "@excalidraw/math/types";
import type { MermaidToExcalidrawLibProps } from "./components/TTDDialog/common";
import { loadMermaidLib } from "./components/TTDDialog/MermaidToExcalidrawLib";
import { FONT_FAMILY } from "@excalidraw/common";
import type { ElementsMap, ExcalidrawElement, NonDeletedExcalidrawElement } from "@excalidraw/element/types";
import { Fonts } from "./fonts";
import type { FontMetadata } from "@excalidraw/common";
import { FONT_METADATA } from "@excalidraw/common";
import type { AppState } from "./types";
import { intersectElementWithLineSegment } from "@excalidraw/element/collision";
import { lineSegment } from "@excalidraw/math";

//zsviczian, my dirty little secrets. These are hacks I am not proud of...
export let hostPlugin: any = null;

export function destroyObsidianUtils() {
  hostPlugin = null;
}

export function initializeObsidianUtils() {
  //@ts-ignore
  hostPlugin = app.plugins.plugins["obsidian-excalidraw-plugin"];
}

function getHostPlugin() {
  if (!hostPlugin) {
    initializeObsidianUtils();
  }
  return hostPlugin;
}

export function getAreaLimit() {
  return getHostPlugin().excalidrawConfig.areaLimit ?? 16777216;
}

export function getWidthHeightLimit() {
  return getHostPlugin().excalidrawConfig.widthHeightLimit ?? 32767;
}

export function allowDoubleTapEraser() {
  return getHostPlugin().settings.penModeDoubleTapEraser;
}

export function getMaxZoom(): number {
  return getHostPlugin().settings.zoomToFitMaxLevel ?? 1;
}

export function isExcaliBrainView() {
  const excalidrawView = getHostPlugin().activeExcalidrawView;
  if (!excalidrawView) {
    return false;
  }
  return (
    excalidrawView.linksAlwaysOpenInANewPane &&
    excalidrawView.allowFrameButtonsInViewMode
  );
}

export function getExcalidrawContentEl(): HTMLElement {
  const excalidrawView = getHostPlugin().activeExcalidrawView;
  if (!excalidrawView) {
    return document.body;
  }
  return excalidrawView.contentEl as HTMLElement;
}

export function hideFreedrawPenmodeCursor() {
  return !getHostPlugin().settings.penModeCrosshairVisible;
}

export function getOpenAIDefaultVisionModel() {
  return getHostPlugin().settings.openAIDefaultVisionModel;
}

export function registerLocalFont(
  fontMetrics: FontMetadata & { name: string },
  uri: string,
) {
  FONT_METADATA[FONT_FAMILY["Local Font"]] = {
    metrics: fontMetrics.metrics,
  };
  Fonts.register("Local Font", fontMetrics, { uri });
}

export function getFontFamilies(): string[] {
  const fontFamilies: Set<string> = new Set();
  for (const fontFaces of Fonts.registered.values()) {
    if (fontFaces.metadata.local) {
      continue;
    }
    for (const font of fontFaces.fontFaces) {
      if (font.fontFace.family === "Local Font") {
        continue;
      }
      fontFamilies.add(font.fontFace.family);
    }
  }
  return Array.from(fontFamilies);
}

export async function registerFontsInCSS() {
  const styleId = "ExcalidrawFonts";
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  } else {
    styleElement.textContent = "";
  }

  let cssContent = "";

  for (const fontFaces of Fonts.registered.values()) {
    if (fontFaces.metadata.local) {
      continue;
    }
    for (const font of fontFaces.fontFaces) {
      try {
        const content = await font.getContentLegacy();
        cssContent += `@font-face {font-family: ${font.fontFace.family}; src: url(${content});}\n`;
      } catch (e) {
        console.error(`Skipped inlining font "${font.toString()}"`, e);
      }
    }
  }
  styleElement.textContent = cssContent;
}

export async function getCSSFontDefinition(
  fontFamily: number,
): Promise<string> {
  const fontFaces = Fonts.registered.get(fontFamily)?.fontFaces;
  if (!fontFaces) {
    return "";
  }
  const fontFace = fontFaces[0];
  if (!fontFace) {
    return "";
  }
  const content = await fontFace.getContentLegacy();
  return `@font-face {font-family: ${fontFaces[0].fontFace.family}; src: url(${content});}`;
}

export async function loadSceneFonts(
  elements: NonDeletedExcalidrawElement[],
): Promise<FontFace[]> {
  return await Fonts.loadElementsFonts(elements);
}

export async function fetchFontFromVault(
  url: string | URL,
): Promise<ArrayBuffer | undefined> {
  url = typeof url === "string" ? url : url.toString();
  if (
    typeof url === "string" &&
    !url.startsWith("data") &&
    url.endsWith(".woff2")
  ) {
    const filename = decodeURIComponent(
      url.substring(url.lastIndexOf("/") + 1),
    );
    const arrayBuffer = await getHostPlugin().loadFontFromFile(filename);
    if (arrayBuffer) {
      return arrayBuffer;
    }
  }
}

//zsviczian (single finger panning in pen mode)
export function isTouchInPenMode(
  appState: AppState,
  event: React.PointerEvent<HTMLElement> | MouseEvent,
) {
  if (!getHostPlugin().settings.penModeSingleFingerPanning) {
    return false;
  }
  //isReactPointerEvent typecheck is here only to please typescript, else event.pointerType === "touch" should be enough
  const isReactPointerEvent = "nativeEvent" in event;
  return (
    appState.penMode &&
    (!isReactPointerEvent || event.pointerType === "touch") &&
    !["text"].includes(appState.activeTool.type)
  );
}

export async function getSharedMermaidInstance(): Promise<MermaidToExcalidrawLibProps> {
  return await getHostPlugin().getMermaid();
}

export async function loadMermaid(): Promise<MermaidToExcalidrawLibProps> {
  return await loadMermaidLib();
}


//moved here as part of https://github.com/zsviczian/excalidraw/pull/286
export const intersectElementWithLine = (
  element: ExcalidrawElement,
  // Point on the line, in absolute coordinates
  a: GlobalPoint,
  // Another point on the line, in absolute coordinates
  b: GlobalPoint,
  // If given, the element is inflated by this value
  gap: number = 0,
  elementsMap: ElementsMap,
): GlobalPoint[] | undefined => {
  return intersectElementWithLineSegment(element, lineSegment(a, b), gap);
};

//disable double click
export const disableDoubleClickTextEditing = () => {
  return getHostPlugin().settings.disableDoubleClickTextEditing ?? false;
}