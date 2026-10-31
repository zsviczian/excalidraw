import { useCallback, useEffect, useState } from "react";

import { addEventListener } from "@excalidraw/common";

import { useUIAppState } from "../../context/ui-appState";
import { t } from "../../i18n";
import { useApp } from "../App";
import { Dialog } from "../Dialog";
import { withInternalFallback } from "../hoc/withInternalFallback";

import MermaidToExcalidraw from "./MermaidToExcalidraw";
import TextToDiagram from "./TextToDiagram";
import TTDDialogTabs from "./TTDDialogTabs";
import { TTDDialogTabTriggers } from "./TTDDialogTabTriggers";
import { TTDDialogTabTrigger } from "./TTDDialogTabTrigger";
import { TTDDialogTab } from "./TTDDialogTab";
// import { isModuleLoadError } from "./utils/mermaidError"; // zsviczian -- host API wrapper owns chunk errors, PR #472

import "./TTDDialog.scss";

import { TTDWelcomeMessage } from "./TTDWelcomeMessage";
// zsviczian -- adapt the stable host service without importing Mermaid, PR #472
import {
  loadMermaidDialogAPI as loadMermaidToExcalidrawLib,
  MermaidHostUnavailableError,
} from "./MermaidToExcalidrawLib";

import type {
  MermaidToExcalidrawLibProps,
  TTDPersistenceAdapter,
  TTTDDialog,
} from "./types";

export const TTDDialog = (
  props:
    | {
        onTextSubmit: TTTDDialog.onTextSubmit;
        renderWelcomeScreen?: TTTDDialog.renderWelcomeScreen;
        renderWarning?: TTTDDialog.renderWarning;
        persistenceAdapter: TTDPersistenceAdapter;
      }
    | { __fallback: true },
) => {
  const appState = useUIAppState();

  if (appState.openDialog?.name !== "ttd") {
    return null;
  }

  return <TTDDialogBase {...props} tab={appState.openDialog.tab} />;
};

TTDDialog.WelcomeMessage = TTDWelcomeMessage;

// zsviczian START -- upstream module loader replaced by the host adapter above, PR #472
/*
const loadMermaidToExcalidrawLib = (
  onChunkLoadError: (api: MermaidToExcalidrawLibProps["api"]) => void,
): MermaidToExcalidrawLibProps["api"] => {
  const api: MermaidToExcalidrawLibProps["api"] = import(
    "@excalidraw/mermaid-to-excalidraw"
  ).then((lib) => ({
    // Pele lazy-loads a chunk per diagram type, which can fail to load
    // (e.g. offline) even though the lib itself loaded fine
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
  }));
  // called from state initializers/updaters, which React may invoke more than
  // once and discard the result -> don't let a discarded promise's rejection
  // go unhandled (consumers awaiting `api` still get the rejection)
  api.catch(() => {});
  return api;
};
*/
// zsviczian END

/**
 * Text to diagram (TTD) dialog
 */
const TTDDialogBase = withInternalFallback(
  "TTDDialogBase",
  ({
    tab,
    ...rest
  }: {
    tab: "text-to-diagram" | "mermaid";
  } & (
    | {
        onTextSubmit(
          props: TTTDDialog.OnTextSubmitProps,
        ): Promise<TTTDDialog.OnTextSubmitRetValue>;
        renderWelcomeScreen?: TTTDDialog.renderWelcomeScreen;
        renderWarning?: TTTDDialog.renderWarning;
        persistenceAdapter: TTDPersistenceAdapter;
      }
    | { __fallback: true }
  )) => {
    const app = useApp();

    const [mermaidToExcalidrawLib, setMermaidToExcalidrawLib] =
      useState<MermaidToExcalidrawLibProps>(() => ({
        status: "loading",
        // zsviczian START -- host activation runs in an effect, never during render, PR #472
        // api: loadMermaidToExcalidrawLib((api) => setLoadError(api)),
        api: new Promise<never>(() => {}),
        // zsviczian END
      }));

    // `api` (or one of the chunks it lazy-loads) failed to load
    const setLoadError = useCallback(
      (api: MermaidToExcalidrawLibProps["api"]) => {
        const reloadRequired = app.ownerWindow.navigator.onLine; // zsviczian -- use the owning window, PR #472
        setMermaidToExcalidrawLib((prev) =>
          prev.api === api
            ? {
                ...prev,
                status: "error",
                reloadRequired: prev.reloadRequired || reloadRequired,
              }
            : prev,
        );
      },
      [app], // zsviczian -- owner-window access above
    );

    // zsviczian START -- preserve lazy host activation after mount, PR #472
    useEffect(() => {
      setMermaidToExcalidrawLib({
        status: "loading",
        api: loadMermaidToExcalidrawLib(setLoadError),
      });
    }, [setLoadError]);
    // zsviczian END

    const retryLoadingMermaidToExcalidrawLib = useCallback(() => {
      setMermaidToExcalidrawLib((prev) =>
        prev.status === "error"
          ? {
              ...prev,
              status: "loading",
              api: loadMermaidToExcalidrawLib(setLoadError),
            }
          : prev,
      );
    }, [setLoadError]);

    const { api: mermaidToExcalidrawLibApi } = mermaidToExcalidrawLib;
    useEffect(() => {
      let isMounted = true; // zsviczian -- do not close a replacement host dialog after unmount
      const api = mermaidToExcalidrawLibApi;
      api.then(
        () => {
          if (!isMounted) {
            return;
          } // zsviczian -- discard late host load results
          setMermaidToExcalidrawLib((prev) =>
            prev.api === api
              ? { ...prev, status: "loaded", reloadRequired: false }
              : prev,
          );
        },
        (error: any) => {
          // zsviczian START -- yield to the host enable prompt, never cover it with TTD, PR #472
          if (!isMounted) {
            return;
          }
          if (error instanceof MermaidHostUnavailableError) {
            app.setOpenDialog(null);
            return;
          }
          // zsviczian END
          console.error("Failed to load mermaid-to-excalidraw", error);
          setLoadError(api);
        },
      );
      return () => {
        isMounted = false;
      }; // zsviczian -- cancel late host callbacks
    }, [app, mermaidToExcalidrawLibApi, setLoadError]);

    // the lib chunk isn't precached, so a failed load is most likely due to
    // being offline -> retry automatically once we're back online
    useEffect(() => {
      if (mermaidToExcalidrawLib.status !== "error") {
        return;
      }
      return addEventListener(
        app.ownerWindow,
        "online",
        retryLoadingMermaidToExcalidrawLib,
      );
    }, [
      app,
      mermaidToExcalidrawLib.status,
      retryLoadingMermaidToExcalidrawLib,
    ]);

    // zsviczian START -- keep host activation prompts visible, PR #472
    if (mermaidToExcalidrawLib.status === "loading") {
      return null;
    }
    const appState = app.state;
    // zsviczian END
    return (
      <Dialog
        className="ttd-dialog"
        onCloseRequest={() => {
          app.setOpenDialog(null);
        }}
        size={1520}
        title={false}
        {...rest}
        showCloseButton // zsviczian -- both Mermaid and text-to-diagram need a visible close affordance.
        autofocus={false}
      >
        <TTDDialogTabs dialog="ttd" tab={tab}>
          {"__fallback" in rest && rest.__fallback ? (
            <p className="dialog-mermaid-title">{t("mermaid.title")}</p>
          ) : (
            <TTDDialogTabTriggers>
              <TTDDialogTabTrigger tab="text-to-diagram">
                <div className="ttd-dialog-tab-trigger__content">
                  {t("labels.textToDiagram")}
                  <div className="ttd-dialog-tab-trigger__badge">
                    {t("chat.aiBeta")}
                  </div>
                </div>
              </TTDDialogTabTrigger>
              <TTDDialogTabTrigger tab="mermaid">
                {t("mermaid.label")}
              </TTDDialogTabTrigger>
            </TTDDialogTabTriggers>
          )}

          {!("__fallback" in rest) && (
            <TTDDialogTab className="ttd-dialog-content" tab="text-to-diagram">
              <TextToDiagram
                mermaidToExcalidrawLib={mermaidToExcalidrawLib}
                onRetryLoad={retryLoadingMermaidToExcalidrawLib}
                onTextSubmit={rest.onTextSubmit}
                renderWelcomeScreen={rest.renderWelcomeScreen}
                renderWarning={rest.renderWarning}
                persistenceAdapter={rest.persistenceAdapter}
              />
            </TTDDialogTab>
          )}
          <TTDDialogTab className="ttd-dialog-content" tab="mermaid">
            <MermaidToExcalidraw
              mermaidToExcalidrawLib={mermaidToExcalidrawLib}
              onRetryLoad={retryLoadingMermaidToExcalidrawLib}
              isActive={tab === "mermaid"}
              selectedElements={app.scene.getSelectedElements(appState)} // zsviczian -- preserve editable Mermaid source
            />
          </TTDDialogTab>
        </TTDDialogTabs>
      </Dialog>
    );
  },
);
