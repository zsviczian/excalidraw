import {
  KEYS,
  matchKey,
  deriveStylesPanelMode, // zsviczian -- include compact/tablet layout alongside full/tray, upstream #12264
} from "@excalidraw/common";

import { isFullPanelMode } from "../obsidianUtils"; // zsviczian -- use the fork's full/tray layout contract, upstream #12264

import { register } from "./register";

import type { AppClassProperties } from "../types"; // zsviczian -- type the shared layout gate, upstream #12264

// zsviczian START -- W belongs to full, tray and compact/tablet layouts; exclude mobile, upstream #12264
const isWrapLayoutEnabled = (app: AppClassProperties) =>
  isFullPanelMode(app) ||
  deriveStylesPanelMode(app.editorInterface) === "compact";
// zsviczian END

export const actionToggleWrap = register({
  name: "toggleWrap",
  label: "labels.toggleWrap",
  trackEvent: { category: "element" },
  predicate: (elements, appState, _, app) =>
    isWrapLayoutEnabled(app) && // zsviczian -- menu availability follows the same layout rule as W, upstream #12264
    app.scene.getSelectedElements(appState).length > 0,
  perform: (elements, appState, _, app) => app.wrap.toggle(elements, appState),
  keyTest: (event, appState, elements, app) =>
    isWrapLayoutEnabled(app) && // zsviczian -- preserve W in the tray and on tablets, upstream #12264
    !event[KEYS.CTRL_OR_CMD] &&
    !event.altKey &&
    !event.shiftKey &&
    matchKey(event, KEYS.W) &&
    app.scene.getSelectedElements(appState).length > 0,
});
