import type { MermaidConfig } from "@excalidraw/mermaid-to-excalidraw";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { getSharedMermaidInstance } from "../../obsidianUtils";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { MermaidToExcalidrawLibProps } from "./types";

let mermaidToExcalidrawLib: MermaidToExcalidrawLibProps | null = null;
let queue: Promise<any> = Promise.resolve();

export const loadMermaidToExcalidrawLib =
  async (): Promise<MermaidToExcalidrawLibProps> => {
    if (!mermaidToExcalidrawLib) {
      mermaidToExcalidrawLib = await getSharedMermaidInstance();
    }
    return mermaidToExcalidrawLib as MermaidToExcalidrawLibProps;
  };

export const loadMermaidLib =
  async (): Promise<MermaidToExcalidrawLibProps> => {
    if (!mermaidToExcalidrawLib) {
      const api = import("@excalidraw/mermaid-to-excalidraw").then((module) => ({
        parseMermaidToExcalidraw: module.parseMermaidToExcalidraw,
      }));
      mermaidToExcalidrawLib = {
        loaded: true,
        api,
      };
    }
    return mermaidToExcalidrawLib;
  };

//zsviczian
export const mermaidToExcalidraw = async (
  mermaidDefinition: string,
  opts: MermaidConfig,
): Promise<
  | {
      elements?: ExcalidrawElement[];
      files?: any;
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
