import React from "react";

import { showSelectedShapeActions } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { isHandToolActive } from "../appState";
import { useTunnels } from "../context/tunnels";
import { t } from "../i18n";
import { calculateScrollCenter, isSomeElementSelected } from "../scene";
import { SCROLLBAR_WIDTH, SCROLLBAR_MARGIN } from "../scene/scrollbars";

import { SelectedShapeActions, ShapesSwitcher, ZoomActions } from "./Actions";
import { FixedSideContainer } from "./FixedSideContainer";
import { HandButton } from "./HandButton";
import { HintViewer } from "./HintViewer";
import { Island } from "./Island";
import { LockButton } from "./LockButton";
import { PenModeButton } from "./PenModeButton";
import { Section } from "./Section";
import Stack from "./Stack";

import type { ActionManager } from "../actions/manager";
import type {
  AppClassProperties,
  AppProps,
  AppState,
  Device,
  ExcalidrawProps,
  UIAppState,
} from "../types";
import type { JSX } from "react";
import clsx from "clsx";
import { Stats } from "./Stats";
import { actionToggleStats } from "../actions";
import { getNonDeletedElements } from "@excalidraw/element";

type MobileMenuProps = {
  appState: UIAppState;
  actionManager: ActionManager;
  renderJSONExportDialog: () => React.ReactNode;
  renderImageExportDialog: () => React.ReactNode;
  setAppState: React.Component<any, AppState>["setState"];
  elements: readonly NonDeletedExcalidrawElement[];
  onLockToggle: () => void;
  onHandToolToggle: () => void;
  onPenModeToggle: AppClassProperties["togglePenMode"];

  renderTopRightUI?: (
    isMobile: boolean,
    appState: UIAppState,
  ) => JSX.Element | null;
  renderCustomStats?: ExcalidrawProps["renderCustomStats"];
  renderSidebars: () => JSX.Element | null;
  device: Device;
  renderWelcomeScreen: boolean;
  UIOptions: AppProps["UIOptions"];
  app: AppClassProperties;
};

export const MobileMenu = ({
  appState,
  elements,
  actionManager,
  setAppState,
  onLockToggle,
  onHandToolToggle,
  onPenModeToggle,

  renderTopRightUI,
  renderCustomStats,
  renderSidebars,
  device,
  renderWelcomeScreen,
  UIOptions,
  app,
}: MobileMenuProps) => {
  const {
    WelcomeScreenCenterTunnel,
    MainMenuTunnel,
    DefaultSidebarTriggerTunnel,
  } = useTunnels();
  const renderToolbar = () => {
    const shouldShowStats = //zsviczian
      appState.stats.open &&
      !appState.zenModeEnabled &&
      !appState.viewModeEnabled;

    return (
      <FixedSideContainer
        side="top"
        className="App-top-bar"
        sidepanelOpen={!!appState.openSidebar /*zsviczian*/}
      >
        {renderWelcomeScreen && <WelcomeScreenCenterTunnel.Out />}
        <Section heading="shapes">
          {(heading: React.ReactNode) => (
            <Stack.Col gap={4} align="center">
              <Stack.Row gap={1} className="App-toolbar-container">
                <Island
                  padding={1}
                  className={`App-toolbar${
                    device.editor.isMobile ? " App-toolbar--mobile" : "" //zsviczian
                  }`}
                >
                  {heading}
                  <Stack.Row gap={1}>
                    <ShapesSwitcher
                      appState={appState}
                      activeTool={appState.activeTool}
                      UIOptions={UIOptions}
                      app={app}
                    />
                  </Stack.Row>
                </Island>
                <div
                  className="mobile-misc-tools-container"
                  style={
                    //zsviczian
                    document.body?.classList.contains("mod-rtl")
                      ? {
                          right: "inherit",
                          left: "calc(var(--editor-container-padding) * -1)",
                        }
                      : undefined
                  }
                >
                  {!appState.viewModeEnabled && //zsviczian
                    renderTopRightUI?.(true, appState)}
                  {!appState.viewModeEnabled &&
                    appState.openDialog?.name !== "elementLinkSelector" && (
                      <DefaultSidebarTriggerTunnel.Out />
                    )}
                  <PenModeButton
                    checked={appState.penMode}
                    onChange={() => onPenModeToggle(null)}
                    title={t("toolBar.penMode")}
                    isMobile
                    penDetected={appState.penDetected}
                  />
                  <LockButton
                    checked={appState.activeTool.locked}
                    onChange={onLockToggle}
                    title={t("toolBar.lock")}
                    isMobile
                  />
                  <HandButton
                    checked={isHandToolActive(appState)}
                    onChange={() => onHandToolToggle()}
                    title={t("toolBar.hand")}
                    isMobile
                  />
                </div>
              </Stack.Row>
            </Stack.Col>
          )}
        </Section>
        <HintViewer
          appState={appState}
          isMobile={true}
          device={device}
          app={app}
        />
        <div //zsviczian
          className={clsx("layer-ui__wrapper__top-right zen-mode-transition", {
            "transition-right": appState.zenModeEnabled,
          })}
          style={{
            marginRight: "4rem",
          }}
        >
          {shouldShowStats && ( //zsviczian
            <Stats
              app={app}
              onClose={() => {
                actionManager.executeAction(actionToggleStats);
              }}
              renderCustomStats={renderCustomStats}
            />
          )}
        </div>
      </FixedSideContainer>
    );
  };

  const renderAppToolbar = () => {
    if (appState.viewModeEnabled) {
      return; //zsviczian
    }
    if (appState.openDialog?.name === "elementLinkSelector") {
      return (
        //zsviczian (see original below)
        <div className="App-toolbar-content">
          <MainMenuTunnel.Out />
        </div>
      );
    }
    /*
    if (
      appState.viewModeEnabled ||
      appState.openDialog?.name === "elementLinkSelector"
    ) {
      return (
        <div className="App-toolbar-content">
          <MainMenuTunnel.Out />
        </div>
      );
    }
    */

    //zsviczian fix mobile menu button positions
    const showEditMenu = showSelectedShapeActions(
      appState,
      getNonDeletedElements(elements),
    );
    const showElAction = isSomeElementSelected(
      getNonDeletedElements(elements),
      appState,
    );

    return (
      <div className="App-toolbar-content">
        <MainMenuTunnel.Out />
        {showEditMenu ? ( //zsviczian
          actionManager.renderAction("toggleEditMenu")
        ) : (
          <div className="ToolIcon__icon" aria-hidden="true" />
        )}
        {showElAction || appState.multiElement ? ( //zsviczian
          actionManager.renderAction(
            appState.multiElement ? "finalize" : "duplicateSelection",
          )
        ) : (
          <div className="ToolIcon__icon" aria-hidden="true" />
        )}
        {showElAction ? ( //zsviczian
          actionManager.renderAction("deleteSelectedElements")
        ) : (
          <div className="ToolIcon__icon" aria-hidden="true" />
        )}
        <div>
          {actionManager.renderAction("undo")}
          {actionManager.renderAction("redo")}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderSidebars()}
      {!appState.viewModeEnabled &&
        appState.openDialog?.name !== "elementLinkSelector" &&
        renderToolbar()}
      <div
        className="App-bottom-bar"
        style={{
          marginBottom: SCROLLBAR_WIDTH + SCROLLBAR_MARGIN, //* 2, zsviczian
          marginLeft: SCROLLBAR_WIDTH + SCROLLBAR_MARGIN * 2,
          marginRight: SCROLLBAR_WIDTH + SCROLLBAR_MARGIN * 2,
        }}
      >
        <Island padding={0}>
          {appState.openMenu === "shape" &&
          !appState.viewModeEnabled &&
          appState.openDialog?.name !== "elementLinkSelector" &&
          showSelectedShapeActions(appState, elements) ? (
            <Section className="App-mobile-menu" heading="selectedShapeActions">
              <SelectedShapeActions
                appState={appState}
                elementsMap={app.scene.getNonDeletedElementsMap()}
                renderAction={actionManager.renderAction}
                app={app}
              />
            </Section>
          ) : null}
          <footer className="App-toolbar">
            {renderAppToolbar()}
            {appState.scrolledOutside &&
              !appState.openMenu &&
              !appState.openSidebar && (
                <button
                  type="button"
                  className="scroll-back-to-content"
                  onClick={() => {
                    setAppState((appState) => ({
                      ...calculateScrollCenter(elements, appState),
                    }));
                  }}
                >
                  {t("buttons.scrollBackToContent")}
                </button>
              )}
          </footer>
        </Island>
        {appState.trayModeEnabled ? ( //zsviczian display zoom menu in tray mode
          <Island padding={1} style={{ marginLeft: `4px` }}>
            <ZoomActions
              renderAction={actionManager.renderAction}
              zoom={appState.zoom}
              trayMode={true}
            />
          </Island>
        ) : (
          ""
        )}
      </div>
    </>
  );
};
