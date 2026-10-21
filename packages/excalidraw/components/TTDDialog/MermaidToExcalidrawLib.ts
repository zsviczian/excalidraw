import { convertToExcalidrawElements } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { MermaidConfig } from "@excalidraw/mermaid-to-excalidraw";

import { getSharedMermaidInstance } from "../../obsidianUtils";

import { isModuleLoadError } from "./utils/mermaidError";

import type { ObsidianMermaidService } from "../../obsidianExcalidrawHost";

import type { MermaidToExcalidrawLibProps } from "./types";
import type { BinaryFiles } from "../../types";

let mermaidToExcalidrawLib: ObsidianMermaidService | null = null;
let queue: Promise<any> = Promise.resolve();

export const loadMermaidToExcalidrawLib =
  async (): Promise<ObsidianMermaidService> => {
    //zsviczian - BEGIN
    if (!mermaidToExcalidrawLib?.loaded) {
      try {
        const sharedMermaid = await getSharedMermaidInstance();
        // Cache only ready instances so users can retry after enabling Mermaid.
        mermaidToExcalidrawLib = sharedMermaid.loaded ? sharedMermaid : null;
        return sharedMermaid;
      } catch (error) {
        mermaidToExcalidrawLib = null;
        throw error;
      }
    }
    //zsviczian - END
    return mermaidToExcalidrawLib as ObsidianMermaidService;
  };

//zsviczian (replaced bundled mermaid-to-excalidraw with instance from obsidianUtils > Excalidraw Extras plugin)
export const loadMermaidLib = async (): Promise<ObsidianMermaidService> => {
  if (!mermaidToExcalidrawLib?.loaded) {
    const sharedMermaid = await getSharedMermaidInstance();
    mermaidToExcalidrawLib = sharedMermaid.loaded ? sharedMermaid : null;
    return sharedMermaid;
  }
  return mermaidToExcalidrawLib;
};

/** zsviczian -- PR #472: yield to the plugin prompt when activation fails. */
export class MermaidHostUnavailableError extends Error {}

/**
 * Adapts the stable host service to upstream's retryable dialog API.
 * Author: zsviczian. PR #472: Mermaid must remain Extras-provided, never imported
 * into the component. Keep host activation failure distinct from parse/chunk
 * failures and release a rejected cached API so the next attempt can recover.
 */
export const loadMermaidDialogAPI = (
  onChunkLoadError: (api: MermaidToExcalidrawLibProps["api"]) => void,
): MermaidToExcalidrawLibProps["api"] => {
  const api: MermaidToExcalidrawLibProps["api"] = (async () => {
    let shared: ObsidianMermaidService;
    try {
      shared = await loadMermaidToExcalidrawLib();
    } catch {
      throw new MermaidHostUnavailableError();
    }
    if (!shared.loaded) {
      // The host may return a rejected API with its disabled/activation result.
      shared.api.catch(() => {});
      throw new MermaidHostUnavailableError();
    }
    let lib: Awaited<ObsidianMermaidService["api"]>;
    try {
      lib = await shared.api;
    } catch (error) {
      if (mermaidToExcalidrawLib === shared) {
        mermaidToExcalidrawLib = null;
      }
      throw error;
    }
    return {
      parseMermaidToExcalidraw: async (definition, config) => {
        try {
          return await lib.parseMermaidToExcalidraw(definition, config);
        } catch (error) {
          if (isModuleLoadError(error)) {
            onChunkLoadError(api);
          }
          throw error;
        }
      },
    };
  })();
  api.catch(() => {});
  return api;
};

//zsviczian
export const mermaidToExcalidraw = async (
  mermaidDefinition: string,
  opts: MermaidConfig,
): Promise<
  | {
      elements?: ExcalidrawElement[];
      files?: BinaryFiles;
      error?: string;
    }
  | undefined
> => {
  return (queue = queue.then(async () => {
    try {
      const { api } = await loadMermaidToExcalidrawLib();
      const { parseMermaidToExcalidraw } = await api;
      const { elements, files } = await parseMermaidToExcalidraw(
        mermaidDefinition,
        opts,
      );

      return {
        elements: convertToExcalidrawElements(
          elements.map((el) => {
            if (el.type === "image") {
              el.customData = { mermaidText: mermaidDefinition };
            }
            return el;
          }),
          {
            regenerateIds: true,
          },
        ),
        files,
      };
    } catch (e: any) {
      return {
        error: e.message,
      };
    }
  }));
};
