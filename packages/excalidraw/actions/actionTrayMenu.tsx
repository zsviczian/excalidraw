import { getNonDeletedElements } from "@excalidraw/element";
import { IconButton } from "../components/IconButton";

import { showSelectedShapeActions } from "@excalidraw/element";

import { CaptureUpdateAction } from "@excalidraw/element";

import { palette } from "../components/icons";
import { t } from "../i18n";

import { register } from "./register";

export const actionToggleTrayEditMenu = register({
  name: "toggleTrayEditMenu",
  label: "buttons.edit",
  trackEvent: { category: "menu" },
  perform: (_elements, appState) => ({
    appState: {
      ...appState,
      openMenu: appState.openMenu === "shape" ? null : "shape",
    },
    captureUpdate: CaptureUpdateAction.EVENTUALLY,
  }),
  PanelComponent: ({ elements, appState, updateData }) => (
    <IconButton
      visible={showSelectedShapeActions(
        appState,
        getNonDeletedElements(elements),
      )}
      type="toggle"
      icon={palette}
      aria-label={t("buttons.edit")}
      onSelect={updateData}
      checked={appState.openMenu === "shape"}
    />
  ),
});
