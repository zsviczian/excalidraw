import React, {
  useEffect,
  forwardRef,
  useContext,
  useState,
  useCallback,
} from "react";
import "./publicPath";

import { InitializeApp } from "../../components/InitializeApp";
import App from "../../components/App";

import "../../css/app.scss";
import "../../css/styles.scss";

import LanguageDetector from "i18next-browser-languagedetector";
import {
  AppProps,
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawAPIRefValue,
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "../../types";
import { defaultLang, Language, t } from "../../i18n";
import {
  APP_NAME,
  DEFAULT_UI_OPTIONS,
  EVENT,
  TITLE_TIMEOUT,
  URL_HASH_KEYS,
} from "../../constants";
import { createStore, keys, del, getMany, set } from "idb-keyval";
import { restoreAppState, RestoredDataState } from "../../data/restore";
import { ImportedDataState } from "../../data/types";
import { FileId, ExcalidrawElement } from "../../element/types";
import {
  STORAGE_KEYS,
  SAVE_TO_LOCAL_STORAGE_TIMEOUT,
  FIREBASE_STORAGE_PREFIXES,
  SYNC_BROWSER_TABS_TIMEOUT,
} from "../../excalidraw-app/app_constants";
import CollabWrapper, {
  CollabAPI,
  CollabContext,
} from "../../excalidraw-app/collab/CollabWrapper";
import { loadScene, getCollaborationLinkData } from "../../excalidraw-app/data";
import {
  FileManager,
  updateStaleImageStatuses,
} from "../../excalidraw-app/data/FileManager";
import {
  saveToLocalStorage,
  importFromLocalStorage,
  getLibraryItemsFromStorage,
  importUsernameFromLocalStorage,
} from "../../excalidraw-app/data/localStorage";
import {
  isBrowserStorageStateNewer,
  updateBrowserStateVersion,
} from "../../excalidraw-app/data/tabSync";
import { debounce, isTestEnv } from "../../utils";
import { loadFromBlob, newElementWith } from "./entry";
import { useCallbackRefState } from "../../hooks/useCallbackRefState";
import { isInitializedImageElement } from "../../element/typeChecks";
import { loadFilesFromFirebase } from "../../excalidraw-app/data/firebase";

const filesStore = createStore("files-db", "files-store");

const clearObsoleteFilesFromIndexedDB = async (opts: {
  currentFileIds: FileId[];
}) => {
  const allIds = await keys(filesStore);
  for (const id of allIds) {
    if (!opts.currentFileIds.includes(id as FileId)) {
      del(id, filesStore);
    }
  }
};

const localFileStorage = new FileManager({
  getFiles(ids) {
    return getMany(ids, filesStore).then(
      (filesData: (BinaryFileData | undefined)[]) => {
        const loadedFiles: BinaryFileData[] = [];
        const erroredFiles = new Map<FileId, true>();
        filesData.forEach((data, index) => {
          const id = ids[index];
          if (data) {
            loadedFiles.push(data);
          } else {
            erroredFiles.set(id, true);
          }
        });

        return { loadedFiles, erroredFiles };
      },
    );
  },
  async saveFiles({ addedFiles }) {
    const savedFiles = new Map<FileId, true>();
    const erroredFiles = new Map<FileId, true>();

    // before we use `storage` event synchronization, let's update the flag
    // optimistically. Hopefully nothing fails, and an IDB read executed
    // before an IDB write finishes will read the latest value.
    updateBrowserStateVersion(STORAGE_KEYS.VERSION_FILES);

    await Promise.all(
      [...addedFiles].map(async ([id, fileData]) => {
        try {
          await set(id, fileData, filesStore);
          savedFiles.set(id, true);
        } catch (error: any) {
          console.error(error);
          erroredFiles.set(id, true);
        }
      }),
    );

    return { savedFiles, erroredFiles };
  },
});

const languageDetector = new LanguageDetector();
languageDetector.init({
  languageUtils: {
    formatLanguageCode: (langCode: Language["code"]) => langCode,
    isWhitelisted: () => true,
  },
  checkWhitelist: false,
});

const saveDebounced = debounce(
  async (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
    onFilesSaved: () => void,
  ) => {
    saveToLocalStorage(elements, appState);

    await localFileStorage.saveFiles({
      elements,
      files,
    });
    onFilesSaved();
  },
  SAVE_TO_LOCAL_STORAGE_TIMEOUT,
);

const onBlur = () => {
  saveDebounced.flush();
};

const initializeScene = async (opts: {
  collabAPI: CollabAPI;
}): Promise<
  { scene: ImportedDataState | null } & (
    | { isExternalScene: true; id: string; key: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  const jsonBackendMatch = window.location.hash.match(
    /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/,
  );
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  const localDataState = importFromLocalStorage();

  let scene: RestoredDataState & {
    scrollToContent?: boolean;
  } = await loadScene(null, null, localDataState);

  let roomLinkData = getCollaborationLinkData(window.location.href);
  const isExternalScene = !!(id || jsonBackendMatch || roomLinkData);
  if (isExternalScene) {
    if (
      // don't prompt if scene is empty
      !scene.elements.length ||
      // don't prompt for collab scenes because we don't override local storage
      roomLinkData ||
      // otherwise, prompt whether user wants to override current scene
      window.confirm(t("alerts.loadSceneOverridePrompt"))
    ) {
      if (jsonBackendMatch) {
        scene = await loadScene(
          jsonBackendMatch[1],
          jsonBackendMatch[2],
          localDataState,
        );
      }
      scene.scrollToContent = true;
      if (!roomLinkData) {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    } else {
      // https://github.com/excalidraw/excalidraw/issues/1919
      if (document.hidden) {
        return new Promise((resolve, reject) => {
          window.addEventListener(
            "focus",
            () => initializeScene(opts).then(resolve).catch(reject),
            {
              once: true,
            },
          );
        });
      }

      roomLinkData = null;
      window.history.replaceState({}, APP_NAME, window.location.origin);
    }
  } else if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);

    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      if (
        !scene.elements.length ||
        window.confirm(t("alerts.loadSceneOverridePrompt"))
      ) {
        return { scene: data, isExternalScene };
      }
    } catch (error: any) {
      return {
        scene: {
          appState: {
            errorMessage: t("alerts.invalidSceneUrl"),
          },
        },
        isExternalScene,
      };
    }
  }

  if (roomLinkData) {
    return {
      scene: await opts.collabAPI.initializeSocketClient(roomLinkData),
      isExternalScene: true,
      id: roomLinkData.roomId,
      key: roomLinkData.roomKey,
    };
  } else if (scene) {
    return isExternalScene && jsonBackendMatch
      ? {
          scene,
          isExternalScene,
          id: jsonBackendMatch[1],
          key: jsonBackendMatch[2],
        }
      : { scene, isExternalScene: false };
  }
  return { scene: null, isExternalScene: false };
};

const Excalidraw = (props: ExcalidrawProps) => {
  const {
    onChange,
    initialData,
    excalidrawRef,
    onCollabButtonClick,
    isCollaborating = false,
    onPointerUpdate,
    renderTopRightUI,
    renderFooter,
    langCode = defaultLang.code,
    viewModeEnabled,
    zenModeEnabled,
    gridModeEnabled,
    libraryReturnUrl,
    theme,
    name,
    renderCustomStats,
    onPaste,
    onDrop, //zsviczian
    detectScroll = true,
    handleKeyboardGlobally = false,
    onLibraryChange,
    autoFocus = false,
    onBeforeTextEdit, //zsviczian
    onBeforeTextSubmit, //zsviczian
    generateIdForFile,
    onThemeChange, //zsviczian
    onLinkOpen,
    onLinkHover, //zsviczian
    onViewModeChange, //zsviczian
  } = props;

  const canvasActions = props.UIOptions?.canvasActions;

  const UIOptions: AppProps["UIOptions"] = {
    canvasActions: {
      ...DEFAULT_UI_OPTIONS.canvasActions,
      ...canvasActions,
    },
  };

  if (canvasActions?.export) {
    UIOptions.canvasActions.export.saveFileToDisk =
      canvasActions.export?.saveFileToDisk ??
      DEFAULT_UI_OPTIONS.canvasActions.export.saveFileToDisk;
  }

  useEffect(() => {
    // Block pinch-zooming on iOS outside of the content area
    const handleTouchMove = (event: TouchEvent) => {
      // @ts-ignore
      if (typeof event.scale === "number" && event.scale !== 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const setLangCode = useState(langCode)[1];

  const [excalidrawAPI] = useCallbackRefState<ExcalidrawImperativeAPI>();

  const collabAPI = useContext(CollabContext)?.api;
  useEffect(() => {
    if (!collabAPI || !excalidrawAPI) {
      return;
    }

    const loadImages = (
      data: ResolutionType<typeof initializeScene>,
      isInitialLoad = false,
    ) => {
      if (!data.scene) {
        return;
      }
      if (collabAPI.isCollaborating()) {
        if (data.scene.elements) {
          collabAPI
            .fetchImageFilesFromFirebase({
              elements: data.scene.elements,
            })
            .then(({ loadedFiles, erroredFiles }) => {
              excalidrawAPI.addFiles(loadedFiles);
              updateStaleImageStatuses({
                excalidrawAPI,
                erroredFiles,
                elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
              });
            });
        }
      } else {
        const fileIds =
          data.scene.elements?.reduce((acc, element) => {
            if (isInitializedImageElement(element)) {
              return acc.concat(element.fileId);
            }
            return acc;
          }, [] as FileId[]) || [];

        if (data.isExternalScene) {
          loadFilesFromFirebase(
            `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
            data.key,
            fileIds,
          ).then(({ loadedFiles, erroredFiles }) => {
            excalidrawAPI.addFiles(loadedFiles);
            updateStaleImageStatuses({
              excalidrawAPI,
              erroredFiles,
              elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
            });
          });
        } else if (isInitialLoad) {
          if (fileIds.length) {
            localFileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  excalidrawAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  excalidrawAPI,
                  erroredFiles,
                  elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
          // on fresh load, clear unused files from IDB (from previous
          // session)
          clearObsoleteFilesFromIndexedDB({ currentFileIds: fileIds });
        }
      }

      data.scene.libraryItems = getLibraryItemsFromStorage();
    };

    //initializeScene({ collabAPI }).then((data) => {
    //  loadImages(data, /* isInitialLoad */ true);
    //  initialStatePromiseRef.current.promise.resolve(data.scene);
    //});

    const onHashChange = (event: HashChangeEvent) => {
      event.preventDefault();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const libraryUrl = hash.get(URL_HASH_KEYS.addLibrary);
      if (libraryUrl) {
        // If hash changed and it contains library url, import it and replace
        // the url to its previous state (important in case of collaboration
        // and similar).
        // Using history API won't trigger another hashchange.
        window.history.replaceState({}, "", event.oldURL);
        excalidrawAPI.importLibrary(libraryUrl, hash.get("token"));
      } else {
        initializeScene({ collabAPI }).then((data) => {
          loadImages(data);
          if (data.scene) {
            excalidrawAPI.updateScene({
              ...data.scene,
              appState: restoreAppState(data.scene.appState, null),
            });
          }
        });
      }
    };

    const titleTimeout = setTimeout(
      () => (document.title = APP_NAME),
      TITLE_TIMEOUT,
    );

    const syncData = debounce(() => {
      if (isTestEnv()) {
        return;
      }
      if (!document.hidden && !collabAPI.isCollaborating()) {
        // don't sync if local state is newer or identical to browser state
        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
          const localDataState = importFromLocalStorage();
          const username = importUsernameFromLocalStorage();
          let langCode = languageDetector.detect() || defaultLang.code;
          if (Array.isArray(langCode)) {
            langCode = langCode[0];
          }
          setLangCode(langCode);
          excalidrawAPI.updateScene({
            ...localDataState,
            libraryItems: getLibraryItemsFromStorage(),
          });
          collabAPI.setUsername(username || "");
        }

        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
          const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
          const currFiles = excalidrawAPI.getFiles();
          const fileIds =
            elements?.reduce((acc, element) => {
              if (
                isInitializedImageElement(element) &&
                // only load and update images that aren't already loaded
                !currFiles[element.fileId]
              ) {
                return acc.concat(element.fileId);
              }
              return acc;
            }, [] as FileId[]) || [];
          if (fileIds.length) {
            localFileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  excalidrawAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  excalidrawAPI,
                  erroredFiles,
                  elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
        }
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onBlur, false);
    window.addEventListener(EVENT.BLUR, onBlur, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, syncData, false);
    window.addEventListener(EVENT.FOCUS, syncData, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onBlur, false);
      window.removeEventListener(EVENT.BLUR, onBlur, false);
      window.removeEventListener(EVENT.FOCUS, syncData, false);
      document.removeEventListener(EVENT.VISIBILITY_CHANGE, syncData, false);
      clearTimeout(titleTimeout);
    };
  }, [collabAPI, excalidrawAPI, setLangCode]);

  const onChangeCollab = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (collabAPI?.isCollaborating()) {
      collabAPI.broadcastElements(elements);
    } else {
      saveDebounced(elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;

          let pendingImageElement = appState.pendingImageElement;
          const elements = excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (localFileStorage.shouldUpdateImageElementStatus(element)) {
                didChange = true;
                const newEl = newElementWith(element, { status: "saved" });
                if (pendingImageElement === element) {
                  pendingImageElement = newEl;
                }
                return newEl;
              }
              return element;
            });

          if (didChange) {
            excalidrawAPI.updateScene({
              elements,
              appState: {
                pendingImageElement,
              },
            });
          }
        }
      });
    }
  };

  const onRoomClose = useCallback(() => {
    localFileStorage.reset();
  }, []);

  return (
    <>
      <InitializeApp langCode={langCode}>
        <App
          onChange={onChange && onChangeCollab}
          initialData={initialData}
          excalidrawRef={excalidrawRef}
          onCollabButtonClick={
            onCollabButtonClick || collabAPI?.onCollabButtonClick
          }
          isCollaborating={isCollaborating || collabAPI?.isCollaborating()}
          onPointerUpdate={onPointerUpdate && collabAPI?.onPointerUpdate}
          renderTopRightUI={renderTopRightUI}
          renderFooter={renderFooter}
          langCode={langCode}
          viewModeEnabled={viewModeEnabled}
          zenModeEnabled={zenModeEnabled}
          gridModeEnabled={gridModeEnabled}
          libraryReturnUrl={libraryReturnUrl}
          theme={theme}
          name={name}
          renderCustomStats={renderCustomStats}
          UIOptions={UIOptions}
          onPaste={onPaste}
          onDrop={onDrop} //zsviczian
          detectScroll={detectScroll}
          handleKeyboardGlobally={handleKeyboardGlobally}
          onLibraryChange={onLibraryChange}
          autoFocus={autoFocus}
          onBeforeTextEdit={onBeforeTextEdit} //zsviczian
          onBeforeTextSubmit={onBeforeTextSubmit} //zsviczian
          generateIdForFile={generateIdForFile}
          onThemeChange={onThemeChange} //zsviczian
          onLinkOpen={onLinkOpen}
          onLinkHover={onLinkHover} //zsviczian
          onViewModeChange={onViewModeChange} //zsviczian
        />
      </InitializeApp>
      {excalidrawAPI && (
        <CollabWrapper
          excalidrawAPI={excalidrawAPI}
          onRoomClose={onRoomClose}
        />
      )}
    </>
  );
};

type PublicExcalidrawProps = Omit<ExcalidrawProps, "forwardedRef">;

const areEqual = (
  prevProps: PublicExcalidrawProps,
  nextProps: PublicExcalidrawProps,
) => {
  const {
    initialData: prevInitialData,
    UIOptions: prevUIOptions = {},
    ...prev
  } = prevProps;
  const {
    initialData: nextInitialData,
    UIOptions: nextUIOptions = {},
    ...next
  } = nextProps;

  // comparing UIOptions
  const prevUIOptionsKeys = Object.keys(prevUIOptions) as (keyof Partial<
    typeof DEFAULT_UI_OPTIONS
  >)[];
  const nextUIOptionsKeys = Object.keys(nextUIOptions) as (keyof Partial<
    typeof DEFAULT_UI_OPTIONS
  >)[];

  if (prevUIOptionsKeys.length !== nextUIOptionsKeys.length) {
    return false;
  }

  const isUIOptionsSame = prevUIOptionsKeys.every((key) => {
    if (key === "canvasActions") {
      const canvasOptionKeys = Object.keys(
        prevUIOptions.canvasActions!,
      ) as (keyof Partial<typeof DEFAULT_UI_OPTIONS.canvasActions>)[];
      canvasOptionKeys.every((key) => {
        if (
          key === "export" &&
          prevUIOptions?.canvasActions?.export &&
          nextUIOptions?.canvasActions?.export
        ) {
          return (
            prevUIOptions.canvasActions.export.saveFileToDisk ===
            nextUIOptions.canvasActions.export.saveFileToDisk
          );
        }
        return (
          prevUIOptions?.canvasActions?.[key] ===
          nextUIOptions?.canvasActions?.[key]
        );
      });
    }
    return true;
  });

  const prevKeys = Object.keys(prevProps) as (keyof typeof prev)[];
  const nextKeys = Object.keys(nextProps) as (keyof typeof next)[];
  return (
    isUIOptionsSame &&
    prevKeys.length === nextKeys.length &&
    prevKeys.every((key) => prev[key] === next[key])
  );
};

const forwardedRefComp = forwardRef<
  ExcalidrawAPIRefValue,
  PublicExcalidrawProps
>((props, ref) => <Excalidraw {...props} excalidrawRef={ref} />);
export default React.memo(forwardedRefComp, areEqual);
export {
  getSceneVersion,
  isInvisiblySmallElement,
  getNonDeletedElements,
} from "../../element";
export { defaultLang, languages } from "../../i18n";
export { restore, restoreAppState, restoreElements } from "../../data/restore";
export {
  exportToCanvas,
  exportToBlob,
  exportToSvg,
  serializeAsJSON,
  loadLibraryFromBlob,
  loadFromBlob,
  getFreeDrawSvgPath,
  getCommonBoundingBox, //zsviczian
  getMaximumGroups, //zsviczian
  intersectElementWithLine, //zsviczian
  determineFocusDistance, //zsviczian
  measureText, //zsviczian
} from "../../packages/utils";
export { isLinearElement } from "../../element/typeChecks";

export { FONT_FAMILY, THEME } from "../../constants";

export {
  mutateElement,
  newElementWith,
  bumpVersion,
} from "../../element/mutateElement";
