/**
 * Obsidian host contract for plugin-wide capabilities used by the Excalidraw
 * package layer.
 *
 * @remarks
 * This fork-only boundary intentionally exposes semantic capabilities, not the
 * plugin instance or its settings object. View-scoped state must not be added
 * here.
 *
 * Author: zsviczian
 *
 * @see https://github.com/zsviczian/obsidian-excalidraw-plugin
 */

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import type { MermaidToExcalidrawLibProps } from "./components/TTDDialog/types";
import type { BinaryFiles } from "./types";

/** Runtime protocol understood by this version of the Excalidraw package. */
export const OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION = 4 as const; // zsviczian -- plugin #3027 adds guarded SVG diagram insertion

/** zsviczian -- staged diagram data only, never a view or plugin object. */
export type ObsidianDiagramInsertion = {
  elements: readonly NonDeletedExcalidrawElement[];
  files: BinaryFiles | null;
};

/** Keyboard-blocking lifecycle returned by the host's inline suggester. */
export interface ObsidianKeyBlocker {
  isBlockingKeys(): boolean;
  close(): void;
}

/**
 * Stable host-provided Mermaid service, independent of the dialog's load state.
 * zsviczian -- PR #472 retains protocol 2's existing { loaded, api } shape.
 */
export interface ObsidianMermaidService {
  loaded: boolean;
  api: MermaidToExcalidrawLibProps["api"];
}

/** Plugin-wide capabilities consumed by the Excalidraw package. */
export interface ObsidianExcalidrawHostAdapter {
  readonly protocolVersion: typeof OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION;

  isDoubleTapEraserEnabled(): boolean;
  getZoomToFitMaxLevel(): number;
  isPenModeCrosshairVisible(): boolean;
  isSingleFingerPanningEnabled(): boolean;
  isDoubleClickTextEditingDisabled(): boolean;
  getZoomStep(): number;
  getZoomMin(): number;
  getZoomMax(): number;
  isContextMenuDisabled(): boolean;
  shouldSyncElementLinkWithText(): boolean;

  loadFontFromFile(filename: string): Promise<ArrayBuffer | undefined>;
  getMermaid(): Promise<ObsidianMermaidService>;
  /** Lucide requires the initiating editor's ID; no active-view state is retained here. */
  runAction(
    action: "anyFile" | "LaTeX" | "card" | "lucide" | "importSVG",
    editorId?: string,
  ): void;
  /** Offer conversion of SVG-backed Mermaid output; null cancels insertion. */
  prepareMermaidSVGInsert(
    editorId: string,
    diagram: ObsidianDiagramInsertion,
  ): Promise<ObsidianDiagramInsertion | null>;
  getLabel(key: string): string;
  attachInlineLinkSuggester(
    inputEl: HTMLInputElement | HTMLTextAreaElement,
    widthWrapper?: HTMLElement,
    container?: HTMLDivElement | null,
    suppressPlaceholder?: boolean,
  ): ObsidianKeyBlocker;
}

/** Idempotent cleanup returned when a package host is configured. */
export type ObsidianExcalidrawHostDisposer = () => void;

type HostRegistration = Readonly<{
  adapter: ObsidianExcalidrawHostAdapter;
  token: symbol;
}>;

let activeRegistration: HostRegistration | null = null;

/**
 * Configures the Obsidian host for this evaluated Excalidraw package runtime.
 *
 * @returns An idempotent, stale-registration-safe disposer.
 */
export const configureObsidianExcalidrawHost = (
  adapter: ObsidianExcalidrawHostAdapter,
): ObsidianExcalidrawHostDisposer => {
  if (adapter.protocolVersion !== OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION) {
    throw new Error(
      `Unsupported Obsidian Excalidraw host protocol: ${String(
        adapter.protocolVersion,
      )}`,
    );
  }

  const token = Symbol("obsidian-excalidraw-host");
  activeRegistration = { adapter, token };
  let disposed = false;

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;

    if (activeRegistration?.token === token) {
      activeRegistration = null;
    }
  };
};

/** Returns the configured package host, or `null` outside Obsidian. */
export const getObsidianExcalidrawHost =
  (): ObsidianExcalidrawHostAdapter | null =>
    activeRegistration?.adapter ?? null;

/** Returns whether this evaluated package runtime has an Obsidian host. */
export const hasObsidianExcalidrawHost = (): boolean =>
  activeRegistration !== null;
