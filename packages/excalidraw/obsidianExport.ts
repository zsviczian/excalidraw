/**
 * Public export compatibility adapters for Obsidian and community scripts.
 * Author: zsviczian
 * Reference: https://github.com/zsviczian/excalidraw/pull/468
 * Upstream replaced these flat options with exportScene. Keep the public host
 * contract while delegating all rendering to that single upstream pipeline.
 */
import { MIME_TYPES } from "@excalidraw/common";

import { getNonDeletedElements } from "@excalidraw/element";

import type {
  ExcalidrawFrameLikeElement,
  NonDeleted,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { getDefaultAppState } from "./appState";
import {
  copyBlobToClipboardAsPng,
  copyTextToSystemClipboard,
  copyToClipboard,
} from "./clipboard";
import { encodePngMetadata } from "./data/image";
import { serializeAsJSON } from "./data/json";
import { restoreAppState, restoreElements } from "./data/restore";
import {
  exportScene,
  exportToClipboard as exportSceneToClipboard,
  getExportConfigFromAppState,
} from "./scene/export";

import type { AppState, BinaryFiles } from "./types";

export { MIME_TYPES };

type ExportOpts = {
  /** restored before exporting */
  elements: readonly NonDeletedExcalidrawElement[];
  appState?: Partial<Omit<AppState, "offsetTop" | "offsetLeft">>;
  files: BinaryFiles | null;
  maxWidthOrHeight?: number;
  exportingFrame?: NonDeleted<ExcalidrawFrameLikeElement> | null;
  getDimensions?: (
    width: number,
    height: number,
  ) => { width: number; height: number; scale?: number };
};

export const exportToCanvas = ({
  elements,
  appState,
  files,
  maxWidthOrHeight,
  getDimensions,
  exportPadding,
  exportingFrame,
}: ExportOpts & {
  exportPadding?: number;
}) => {
  const restoredAppState = restoreAppState(appState, null);
  return exportScene({
    type: "canvas",
    data: { elements, appState, files },
    config: {
      ...getExportConfigFromAppState(restoredAppState),
      padding: exportPadding,
      exportingFrame,
      // Legacy raster exports ignore exportScale unless maxWidthOrHeight is set.
      scale: 1,
      environment: {
        configureCanvas(canvas, width, height) {
          if (maxWidthOrHeight) {
            if (typeof getDimensions === "function") {
              console.warn(
                "`getDimensions()` is ignored when `maxWidthOrHeight` is supplied.",
              );
            }
            const max = Math.max(width, height);
            const scale =
              maxWidthOrHeight < max
                ? maxWidthOrHeight / max
                : appState?.exportScale ?? 1;
            canvas.width = width * scale;
            canvas.height = height * scale;
            return scale;
          }
          const dimensions = getDimensions?.(width, height) ?? {
            width,
            height,
          };
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          return dimensions.scale ?? 1;
        },
      },
    },
  });
};

export const exportToBlob = async (
  opts: ExportOpts & {
    mimeType?: string;
    quality?: number;
    exportPadding?: number;
  },
): Promise<Blob> => {
  let { mimeType = MIME_TYPES.png, quality } = opts;

  if (mimeType === MIME_TYPES.png && typeof quality === "number") {
    console.warn(`"quality" will be ignored for "${MIME_TYPES.png}" mimeType`);
  }

  // typo in MIME type (should be "jpeg")
  if (mimeType === "image/jpg") {
    mimeType = MIME_TYPES.jpg;
  }

  if (mimeType === MIME_TYPES.jpg && !opts.appState?.exportBackground) {
    console.warn(
      `Defaulting "exportBackground" to "true" for "${MIME_TYPES.jpg}" mimeType`,
    );
    opts = {
      ...opts,
      appState: { ...opts.appState, exportBackground: true },
    };
  }

  const canvas = await exportToCanvas(opts);

  quality = quality ? quality : /image\/jpe?g/.test(mimeType) ? 0.92 : 0.8;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          return reject(new Error("couldn't export to blob"));
        }
        if (
          blob &&
          mimeType === MIME_TYPES.png &&
          opts.appState?.exportEmbedScene
        ) {
          blob = await encodePngMetadata({
            blob,
            metadata: serializeAsJSON(
              // NOTE as long as we're using the Scene hack, we need to ensure
              // we pass the original, uncloned elements when serializing
              // so that we keep ids stable (restoring keeps the ids)
              restoreElements(opts.elements, null),
              opts.appState,
              opts.files || {},
              "local",
            ),
          });
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
};

export const exportToSvg = async ({
  elements,
  appState = getDefaultAppState(),
  files = {},
  exportPadding,
  renderEmbeddables,
  exportingFrame,
  skipInliningFonts,
  reuseImages,
}: Omit<ExportOpts, "getDimensions"> & {
  exportPadding?: number;
  renderEmbeddables?: boolean;
  skipInliningFonts?: true;
  reuseImages?: boolean;
}): Promise<SVGSVGElement> => {
  const restoredAppState = restoreAppState(appState, null);
  return exportScene({
    type: "svg",
    data: { elements, appState, files },
    config: {
      ...getExportConfigFromAppState(restoredAppState),
      padding: exportPadding,
      exportingFrame,
      renderEmbeddables,
      skipInliningFonts,
      reuseImages,
      embedScene: restoredAppState.exportEmbedScene,
    },
  });
};

export const exportToClipboard = async (
  opts:
    | Parameters<typeof exportSceneToClipboard>[0]
    | (ExportOpts & {
        mimeType?: string;
        quality?: number;
        type: "png" | "svg" | "json";
      }),
) => {
  if ("data" in opts) {
    return exportSceneToClipboard(opts);
  }
  if (opts.type === "svg") {
    const svg = await exportToSvg(opts);
    await copyTextToSystemClipboard(svg.outerHTML);
  } else if (opts.type === "png") {
    await copyBlobToClipboardAsPng(exportToBlob(opts));
  } else if (opts.type === "json") {
    await copyToClipboard(
      getNonDeletedElements(restoreElements(opts.elements, null)),
      opts.files,
    );
  } else {
    throw new Error("Invalid export type");
  }
};
