import {
  DEFAULT_CANVAS_BACKGROUND_PICKS,
  DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE,
  CURSOR_TYPE,
  THEME,
  updateActiveTool,
  CODES,
  KEYS,
} from "@excalidraw/common";

import { getNonDeletedElements } from "@excalidraw/element";
import { newElementWith } from "@excalidraw/element";
import { getCommonBounds } from "@excalidraw/element";

import { CaptureUpdateAction } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import {
  getDefaultAppState,
  isEraserActive,
  isHandToolActive,
  isLaserPointerActive,
} from "../appState";
import { ColorPicker } from "../components/ColorPicker/ColorPicker";
import { ToolButton } from "../components/ToolButton";
import { Tooltip } from "../components/Tooltip";
import {
  handIcon,
  laserPointerToolIcon,
  LassoIcon,
  MoonIcon,
  SunIcon,
  TrashIcon,
  zoomAreaIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomResetIcon,
} from "../components/icons";
import { setCursor } from "../cursor";
import { useAppStateValue } from "../hooks/useAppStateValue";

import { t } from "../i18n";
import { getNormalizedZoom } from "../scene";
import { getStateForZoom } from "../scene/zoom";
import { constrainScrollState, zoomToFitBounds } from "../viewport";
import { getShortcutKey } from "../shortcut";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";
import { getMaxZoom, getZoomMax, getZoomMin, getZoomStep } from "../obsidianUtils";
import { excludeElementsInFramesFromSelection } from "@excalidraw/element/selection";

export const actionChangeViewBackgroundColor = register<Partial<AppState>>({
  name: "changeViewBackgroundColor",
  label: "labels.canvasBackground",
  trackEvent: false,
  predicate: (elements, appState, props, app) => {
    return (
      !!app.props.UIOptions.canvasActions.changeViewBackgroundColor &&
      !appState.viewModeEnabled
    );
  },
  perform: (_, appState, value) => {
    return {
      appState: { ...appState, ...value },
      captureUpdate: !!value?.viewBackgroundColor
        ? CaptureUpdateAction.IMMEDIATELY
        : CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ elements, appState, updateData, appProps, data }) => {
    // FIXME move me to src/components/mainMenu/DefaultItems.tsx
    return (
      <ColorPicker
        topPicks={
          //zsviczian
          appState.colorPalette?.topPicks?.canvasBackground ??
          DEFAULT_CANVAS_BACKGROUND_PICKS
        }
        palette={
          //zsviczian
          appState.colorPalette?.canvasBackground ??
          DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE
        }
        label={t("labels.canvasBackground")}
        type="canvasBackground"
        color={appState.viewBackgroundColor}
        onChange={(color) => updateData({ viewBackgroundColor: color })}
        data-testid="canvas-background-picker"
        elements={elements}
        appState={appState}
        updateData={updateData}
      />
    );
  },
});

export const actionClearCanvas = register({
  name: "clearCanvas",
  label: "labels.clearCanvas",
  icon: TrashIcon,
  trackEvent: { category: "canvas" },
  predicate: (elements, appState, props, app) => {
    return (
      !!app.props.UIOptions.canvasActions.clearCanvas &&
      !appState.viewModeEnabled &&
      appState.openDialog?.name !== "elementLinkSelector"
    );
  },
  perform: (elements, appState, _, app) => {
    app.imageCache.clear();
    return {
      elements: elements.map((element) =>
        newElementWith(element, { isDeleted: true }),
      ),
      appState: {
        ...getDefaultAppState(),
        files: {},
        theme: appState.theme,
        penMode: appState.penMode,
        penDetected: appState.penDetected,
        exportBackground: appState.exportBackground,
        exportEmbedScene: appState.exportEmbedScene,
        gridSize: appState.gridSize,
        gridStep: appState.gridStep,
        gridModeEnabled: appState.gridModeEnabled,
        stats: appState.stats,
        activeTool:
          appState.activeTool.type === "image"
            ? {
                ...appState.activeTool,
                type: app.state.preferredSelectionTool.type,
              }
            : appState.activeTool,
        colorPalette: appState.colorPalette, //zsviczian
        allowPinchZoom: appState.allowPinchZoom, //zsviczian
        allowWheelZoom: appState.allowWheelZoom, //zsviczian
        disableContextMenu: appState.disableContextMenu, //zsviczian
        pinnedScripts: appState.pinnedScripts, //zsviczian
        customPens: appState.customPens, //zsviczian
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
});

export const actionZoomIn = register({
  name: "zoomIn",
  label: "buttons.zoomIn",
  viewMode: true,
  icon: ZoomInIcon,
  trackEvent: { category: "canvas" },
  perform: (_elements, appState, _, app) => {
    const nextState = {
      ...appState,
      ...getStateForZoom(
        {
          viewportX: appState.width / 2 + appState.offsetLeft,
          viewportY: appState.height / 2 + appState.offsetTop,
          nextZoom: getNormalizedZoom(appState.zoom.value + getZoomStep()), //zsviczian
        },
        appState,
      ),
      userToFollow: null,
    };
    return {
      appState: { ...nextState, ...constrainScrollState(nextState) },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ updateData }) => {
    const zoomValue = useAppStateValue((appState) => appState.zoom.value);
    return (
      <ToolButton
        type="button"
        className="zoom-in-button zoom-button"
        icon={ZoomInIcon}
        title={`${t("buttons.zoomIn")} — ${getShortcutKey("CtrlOrCmd++")}`}
        aria-label={t("buttons.zoomIn")}
        disabled={zoomValue >= getZoomMax()} //zsviczian
        onClick={() => {
          updateData(null);
        }}
      />
    );
  },
  keyTest: (event) =>
    (event.code === CODES.EQUAL || event.code === CODES.NUM_ADD) &&
    (event[KEYS.CTRL_OR_CMD] || event.shiftKey),
});

export const actionZoomOut = register({
  name: "zoomOut",
  label: "buttons.zoomOut",
  icon: ZoomOutIcon,
  viewMode: true,
  trackEvent: { category: "canvas" },
  perform: (_elements, appState, _, app) => {
    const nextState = {
      ...appState,
      ...getStateForZoom(
        {
          viewportX: appState.width / 2 + appState.offsetLeft,
          viewportY: appState.height / 2 + appState.offsetTop,
          nextZoom: getNormalizedZoom(appState.zoom.value - getZoomStep()),
        },
        appState,
      ),
      userToFollow: null,
    };
    return {
      appState: { ...nextState, ...constrainScrollState(nextState) },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ updateData }) => {
    const zoomValue = useAppStateValue((appState) => appState.zoom.value);
    return (
      <ToolButton
        type="button"
        className="zoom-out-button zoom-button"
        icon={ZoomOutIcon}
        title={`${t("buttons.zoomOut")} — ${getShortcutKey("CtrlOrCmd+-")}`}
        aria-label={t("buttons.zoomOut")}
        disabled={zoomValue <= getZoomMin()} //zsviczian
        onClick={() => {
          updateData(null);
        }}
      />
    );
  },
  keyTest: (event) =>
    (event.code === CODES.MINUS || event.code === CODES.NUM_SUBTRACT) &&
    (event[KEYS.CTRL_OR_CMD] || event.shiftKey),
});

export const actionResetZoom = register({
  name: "resetZoom",
  label: "buttons.resetZoom",
  icon: ZoomResetIcon,
  viewMode: true,
  trackEvent: { category: "canvas" },
  perform: (_elements, appState, _, app) => {
    // reset to 100%, unless a zoom lock floors the zoom higher — then reset to
    // the locked minimum zoom (the lock's resting zoom level)
    const nextZoom = appState.scrollConstraints?.lockZoom
      ? appState.scrollConstraints.zoom
      : 1;
    const nextState = {
      ...appState,
      ...getStateForZoom(
        {
          viewportX: appState.width / 2 + appState.offsetLeft,
          viewportY: appState.height / 2 + appState.offsetTop,
          nextZoom: getNormalizedZoom(nextZoom),
        },
        appState,
      ),
      userToFollow: null,
    };
    return {
      // re-clamp so the reset can't escape an active scroll/zoom lock
      appState: { ...nextState, ...constrainScrollState(nextState) },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ updateData }) => {
    const zoomValue = useAppStateValue((appState) => appState.zoom.value);
    return (
      // zsviczian <Tooltip label={t("buttons.resetZoom")} style={{ height: "100%" }}>
        <ToolButton
          type="button"
          className="reset-zoom-button zoom-button"
          title={t("buttons.resetZoom")}
          aria-label={t("buttons.resetZoom")}
          onClick={() => {
            updateData(null);
          }}
        >
          {(zoomValue * 100).toFixed(0)}%
        </ToolButton>
      //zsviczian </Tooltip>
    );
  },
  keyTest: (event) =>
    (event.code === CODES.ZERO || event.code === CODES.NUM_ZERO) &&
    (event[KEYS.CTRL_OR_CMD] || event.shiftKey),
});

// Note, this action differs from actionZoomToFitSelection in that it doesn't
// zoom beyond 100%. In other words, if the content is smaller than viewport
// size, it won't be zoomed in.
export const actionZoomToFitSelectionInViewport = register({
  name: "zoomToFitSelectionInViewport",
  label: "labels.zoomToFitViewport",
  icon: zoomAreaIcon,
  trackEvent: { category: "canvas" },
  predicate: (elements, appState) => !appState.scrollConstraints,
  perform: (elements, appState, _, app) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    const nonDeletedSelectedElements = getNonDeletedElements(
      (selectedElements.length
        ? selectedElements
        : elements) as ExcalidrawElement[],
    );
    return zoomToFitBounds({
      bounds: getCommonBounds(nonDeletedSelectedElements),
      appState: {
        ...appState,
        userToFollow: null,
      },
      fit: "scale-down",
      canvasOffsets: app.getViewportOffsets(),
    });
  },
  // NOTE shift-2 should have been assigned actionZoomToFitSelection.
  // TBD on how proceed
  keyTest: (event, appState) =>
    !appState.scrollConstraints &&
    event.code === CODES.TWO &&
    event.shiftKey &&
    !event.altKey &&
    !event[KEYS.CTRL_OR_CMD],
});

export const actionZoomToFitSelection = register({
  name: "zoomToFitSelection",
  label: "helpDialog.zoomToSelection",
  icon: zoomAreaIcon,
  trackEvent: { category: "canvas" },
  predicate: (elements, appState) => !appState.scrollConstraints,
  perform: (elements, appState, _, app) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    const nonDeletedSelectedElements = getNonDeletedElements(
      (selectedElements.length
        ? selectedElements
        : elements) as ExcalidrawElement[],
    );
    return zoomToFitBounds({
      bounds: getCommonBounds(nonDeletedSelectedElements),
      appState: {
        ...appState,
        userToFollow: null,
      },
      fit: "contain",
      canvasOffsets: app.getViewportOffsets(),
    });
  },
  // NOTE this action should use shift-2 per figma, alas
  keyTest: (event, appState) =>
    !appState.scrollConstraints &&
    event.code === CODES.THREE &&
    event.shiftKey &&
    !event.altKey &&
    !event[KEYS.CTRL_OR_CMD],
});

export const actionZoomToFit = register({
  name: "zoomToFit",
  label: "helpDialog.zoomToFit",
  icon: zoomAreaIcon,
  viewMode: true,
  trackEvent: { category: "canvas" },
  predicate: (elements, appState) => !appState.scrollConstraints,
  perform: (elements, appState, _, app) =>
    zoomToFitBounds({
      bounds: getCommonBounds(getNonDeletedElements(elements)),
      appState: {
        ...appState,
        userToFollow: null,
      },
      fit: "scale-down",
      canvasOffsets: app.getViewportOffsets(),
    }),
  keyTest: (event, appState) =>
    !appState.scrollConstraints &&
    event.code === CODES.ONE &&
    event.shiftKey &&
    !event.altKey &&
    !event[KEYS.CTRL_OR_CMD],
});

export const actionToggleTheme = register<AppState["theme"]>({
  name: "toggleTheme",
  label: (_, appState) => {
    return appState.theme === THEME.DARK
      ? "buttons.lightMode"
      : "buttons.darkMode";
  },
  keywords: ["toggle", "dark", "light", "mode", "theme"],
  icon: (appState, elements) =>
    appState.theme === THEME.LIGHT ? MoonIcon : SunIcon,
  viewMode: true,
  trackEvent: { category: "canvas" },
  perform: (_, appState, value, app) => {
    const nextTheme =
      value || (appState.theme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT);

    if (app.props.onThemeChange) {
      app.props.onThemeChange(nextTheme);
      //return false; //zsviczian (I don't understand why the return false here)
    }

    return {
      appState: {
        ...appState,
        theme: nextTheme,
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  keyTest: (event) =>
    !event[KEYS.CTRL_OR_CMD] &&
    event.altKey &&
    event.shiftKey &&
    event.code === CODES.D,
  predicate: (elements, appState, props, app) => {
    return !!app.props.UIOptions.canvasActions.toggleTheme;
  },
});

export const actionToggleEraserTool = register({
  name: "toggleEraserTool",
  label: "toolBar.eraser",
  trackEvent: { category: "toolbar" },
  perform: (elements, appState, _, app) => {
    let activeTool: AppState["activeTool"];

    if (isEraserActive(appState)) {
      activeTool = updateActiveTool(appState, {
        ...(appState.activeTool.lastActiveTool || {
          type: app.state.preferredSelectionTool.type,
        }),
        lastActiveToolBeforeEraser: null,
      });
    } else {
      activeTool = updateActiveTool(appState, {
        type: "eraser",
        lastActiveToolBeforeEraser: appState.activeTool,
      });
    }

    return {
      appState: {
        ...appState,
        selectedElementIds: {},
        selectedGroupIds: {},
        activeEmbeddable: null,
        activeTool,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  keyTest: (event, appState) =>
    event.key === KEYS.E &&
    !appState.newElement &&
    !appState.selectedLinearElement?.isEditing &&
    !appState.selectedLinearElement?.isDragging,
});

export const actionToggleLassoTool = register({
  name: "toggleLassoTool",
  label: "toolBar.lasso",
  icon: LassoIcon,
  trackEvent: { category: "toolbar" },
  predicate: (elements, appState, props, app) => {
    return app.state.preferredSelectionTool.type !== "lasso";
  },
  perform: (elements, appState, _, app) => {
    let activeTool: AppState["activeTool"];

    if (appState.activeTool.type !== "lasso") {
      activeTool = updateActiveTool(appState, {
        type: "lasso",
        fromSelection: false,
      });
      setCursor(app.interactiveCanvas, CURSOR_TYPE.CROSSHAIR);
    } else {
      activeTool = updateActiveTool(appState, {
        type: "selection",
      });
    }

    return {
      appState: {
        ...appState,
        selectedElementIds: {},
        selectedGroupIds: {},
        activeEmbeddable: null,
        activeTool,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
});

export const actionToggleHandTool = register({
  name: "toggleHandTool",
  label: "toolBar.hand",
  trackEvent: { category: "toolbar" },
  icon: handIcon,
  viewMode: false,
  perform: (elements, appState, _, app) => {
    let activeTool: AppState["activeTool"];

    if (isHandToolActive(appState)) {
      activeTool = updateActiveTool(appState, {
        ...(appState.activeTool.lastActiveTool || {
          type: "selection",
        }),
        lastActiveToolBeforeEraser: null,
      });
    } else {
      activeTool = updateActiveTool(appState, {
        type: "hand",
        lastActiveToolBeforeEraser: appState.activeTool,
      });
      setCursor(app.interactiveCanvas, CURSOR_TYPE.GRAB);
    }

    return {
      appState: {
        ...appState,
        selectedElementIds: {},
        selectedGroupIds: {},
        activeEmbeddable: null,
        activeTool,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  keyTest: (event) =>
    !event.altKey && !event[KEYS.CTRL_OR_CMD] && event.key === KEYS.H,
});

export const actionToggleLaserPointer = register({
  //zsviczian - did I really add this? Delta compared to excalidraw.com
  name: "toggleLaserPointerTool",
  viewMode: true,
  trackEvent: { category: "menu" },
  perform(elements, appState, _, app) {
    let activeTool: AppState["activeTool"];

    if (isLaserPointerActive(appState)) {
      activeTool = updateActiveTool(appState, {
        ...(appState.activeTool.lastActiveTool || {
          type: "selection",
        }),
        lastActiveToolBeforeEraser: null,
      });
      setCursor(
        app.interactiveCanvas,
        appState.viewModeEnabled ? CURSOR_TYPE.GRAB : CURSOR_TYPE.POINTER,
      );
    } else {
      activeTool = updateActiveTool(appState, {
        type: "laser",
        lastActiveToolBeforeEraser: appState.activeTool,
      });
      setCursor(app.interactiveCanvas, CURSOR_TYPE.CROSSHAIR);
    }

    return {
      appState: {
        ...appState,
        selectedElementIds: {},
        selectedGroupIds: {},
        activeEmbeddable: null,
        activeTool,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
  checked: (appState) => appState.activeTool.type === "laser",
  label: "labels.laser",
  icon: laserPointerToolIcon,
});

//zsviczian
export const zoomToFitElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
  zoomToSelection: boolean,
  app: AppClassProperties, //zsviczian
  maxZoom?: number, //zsviczian
  margin: number = 0, //zsviczian
) => {
  if (typeof maxZoom === "undefined") {
    //zsviczian
    maxZoom = getMaxZoom();
  }
  const nonDeletedElements = getNonDeletedElements(elements);
  const selectedElements = app.scene.getSelectedElements(appState);

  const commonBounds =
    zoomToSelection && selectedElements.length > 0
      ? getCommonBounds(excludeElementsInFramesFromSelection(selectedElements))
      : getCommonBounds(
          excludeElementsInFramesFromSelection(nonDeletedElements),
        );

  //zsviczian: keep Obsidian zoom customization (maxZoom + zoom step) on top of upstream viewport API
  const inset = {
    top: appState.height * margin * 0.5,
    right: appState.width * margin * 0.5,
    bottom: appState.height * margin * 0.5,
    left: appState.width * margin * 0.5,
  };

  return {
    ...zoomToFitBounds({
      bounds: commonBounds,
      appState,
      fit: "contain",
      canvasOffsets: inset,
      maxZoom, //zsviczian
      //zsviczian: preserve legacy API behavior (no viewport ZOOM_STEP snapping)
      steppedZoom: false,
    }),
    commitToHistory: false,
  };
};
