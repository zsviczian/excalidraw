import { createContext, useContext } from "react";

import { colorToHex, isTransparent } from "@excalidraw/common";

import { useTopPicksDnD } from "../TopPicksDnD/topPicksDnD";

import type {
  CreateTopPicksGhost,
  TopPicksDnD,
} from "../TopPicksDnD/topPicksDnD";

/** value-equality of colors — normalizes notation (`#fff` vs `#ffffff` vs
 * `white`) so visually identical colors can't occupy multiple pick slots */
const isSameColor = (a: string, b: string) => {
  if (a.toLowerCase() === b.toLowerCase()) {
    return true;
  }
  const aHex = colorToHex(a);
  return aHex !== null && aHex === colorToHex(b);
};

const createColorGhost: CreateTopPicksGhost<string> = ({
  value: color,
  sourceEl,
}) => {
  const ownerDocument = sourceEl.ownerDocument;
  const ownerWindow = ownerDocument.defaultView ?? window; // zsviczian -- create and style color ghosts in the source realm, upstream #11997
  const swatch = ownerDocument.createElement("div"); // zsviczian -- keep color ghost content in the popout document, upstream #11997
  swatch.className = "excalidraw-color-dnd-ghost-swatch";
  if (isTransparent(color)) {
    swatch.classList.add("is-transparent");
  } else {
    // swatches render the theme-adjusted color (dark mode remaps colors
    // rather than CSS-filtering them) — sample the rendered color so the
    // ghost matches what the user picked up
    const rendered = ownerWindow.getComputedStyle(sourceEl).backgroundColor; // zsviczian -- read styles through the source window, upstream #11997
    swatch.style.backgroundColor =
      rendered && rendered !== "rgba(0, 0, 0, 0)" ? rendered : color;
  }
  return { content: swatch, rect: sourceEl.getBoundingClientRect() };
};

export type ColorPickerDnD = TopPicksDnD<string>;

export const ColorPickerDnDContext = createContext<ColorPickerDnD | null>(null);

export const useColorPickerDnD = () => useContext(ColorPickerDnDContext);

/** pinning colors from the picker popup (palette/shades/custom) or the
 * active-color trigger to the top-picks strip, and reordering the strip */
export const useColorTopPicksDnD = ({
  enabled,
  picks,
  onPicksChange,
}: {
  enabled: boolean;
  picks: readonly string[];
  onPicksChange: (picks: string[]) => void;
}): ColorPickerDnD =>
  useTopPicksDnD({
    enabled,
    picks,
    onPicksChange,
    isSamePick: isSameColor,
    createGhost: createColorGhost,
  });
