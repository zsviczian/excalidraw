import { FreedrawIcon } from "./components/icons";
import { FONT_FAMILY } from "./constants";
import { NonDeletedExcalidrawElement } from "./element/types";
import { Fonts, register } from "./fonts";
import type { FontMetadata } from "./fonts/metadata";
import { FONT_METADATA } from "./fonts/metadata";

//zsviczian, my dirty little secrets. These are hacks I am not proud of...
export let hostPlugin: any = null;

export function destroyObsidianUtils() {
  hostPlugin = null;
}

export function initializeObsidianUtils(obsidianPlugin: any) {
  hostPlugin = obsidianPlugin;
}

export function getAreaLimit() {
  return hostPlugin.excalidrawConfig.areaLimit ?? 16777216;
}

export function getWidthHeightLimit() {
  return hostPlugin.excalidrawConfig.widthHeightLimit ?? 32767;
}

export function allowDoubleTapEraser() {
  return hostPlugin.settings.penModeDoubleTapEraser;
}

export function getMaxZoom(): number {
  return hostPlugin.settings.zoomToFitMaxLevel ?? 1;
}

export function isExcaliBrainView() {
  const excalidrawView = hostPlugin.activeExcalidrawView;
  if (!excalidrawView) {
    return false;
  }
  return (
    excalidrawView.linksAlwaysOpenInANewPane &&
    excalidrawView.allowFrameButtonsInViewMode
  );
}

export function getExcalidrawContentEl(): HTMLElement {
  const excalidrawView = hostPlugin.activeExcalidrawView;
  if (!excalidrawView) {
    return document.body;
  }
  return excalidrawView.contentEl as HTMLElement;
}

export function hideFreedrawPenmodeCursor() {
  return !hostPlugin.settings.penModeCrosshairVisible;
}

export function getOpenAIDefaultVisionModel() {
  return hostPlugin.settings.openAIDefaultVisionModel;
}

export function registerLocalFont(
  fontMetrics: FontMetadata & { name: string },
  uri: string,
) {
  const _register = register.bind({ registered: Fonts.registered });
  FONT_METADATA[FONT_FAMILY["Local Font"]] = {
    metrics: fontMetrics.metrics,
    icon: FreedrawIcon,
  };
  _register("Local Font", fontMetrics, { uri });
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

export async function loadSceneFonts(elements: NonDeletedExcalidrawElement[]): Promise<void> {
  const fontFamilies = Fonts.getElementsFamilies(elements);
  await Fonts.loadFontFaces(fontFamilies);
}

export async function fetchFontFromVault(url: string | URL): Promise<ArrayBuffer|undefined|string> {
  if(typeof url === "string" && !url.startsWith("data") && url.endsWith(".woff2")) {
    const filename = decodeURIComponent(url.substring(url.lastIndexOf("/")+1));
    const arrayBuffer = hostPlugin.loadFontFromFile(filename)
    if(arrayBuffer) {
      return arrayBuffer;
    }
    if (["Assistant-Regular.woff2", "Assistant-Medium.woff2", "Assistant-SemiBold.woff2", "Assistant-Bold.woff2"].includes(filename)) {
      return "https://unpkg.com/@zsviczian/excalidraw@0.17.1-obsidian-58/dist/excalidraw-assets/" + filename;
    }
  }
  return;
}