/**
 * zsviczian -- PR #482: preserve the public host/EA curve option removed by
 * converter 3.6. Extras adapts this option using the pinned converter's Pele
 * boundary. Keep source, errors and definition-level overrides untouched.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/482
 */
import type { MermaidConfig } from "@excalidraw/mermaid-to-excalidraw";

export type ObsidianMermaidConfig = MermaidConfig & {
  /** Legacy caller default; a curve in the definition still takes precedence. */
  flowchart?: { curve?: "linear" | "basis" };
};
