/**
 * zsviczian -- trusted Alt/Option+Arrow navigation through the built component.
 * Author: zsviczian. Checks real mouse selection and all desktop layouts.
 * Reference: https://github.com/excalidraw/excalidraw/pull/12646
 */
import assert from "node:assert/strict";

export async function verifyFlowchartNavigation(page) {
  const original = await page.evaluate(() => ({
    elements: window.__testAPI.getSceneElements(),
    appState: Object.fromEntries(
      [
        "selectedElementIds",
        "scrollX",
        "scrollY",
        "zoom",
        "activeTool",
        "viewModeEnabled",
        "openPopup",
      ].map((key) => [key, window.__testAPI.getAppState()[key]]),
    ),
    mode: window.__testAPI.getEditorInterface().desktopUIMode,
  }));
  const evidence = [];
  try {
    for (const labeled of [false, true]) {
      const positions = await page.evaluate((labeled) => {
        const directions = [
          ["up", 300, 100],
          ["down", 300, 500],
          ["left", 100, 300],
          ["right", 500, 300],
        ];
        const graph = window.__testLibrary.convertToExcalidrawElements(
          [
            {
              id: "nav-center",
              type: "rectangle",
              x: 300,
              y: 300,
              width: 100,
              height: 60,
            },
            ...directions.map(([direction, x, y]) => ({
              id: `nav-${direction}`,
              type: "rectangle",
              x,
              y,
              width: 100,
              height: 60,
            })),
            ...directions.map(([direction, x, y]) => ({
              type: "arrow",
              x: 350,
              y: 330,
              width: Math.abs(x - 300),
              height: Math.abs(y - 300),
              points: [
                [0, 0],
                [x - 300, y - 300],
              ],
              start: { id: "nav-center" },
              end: { id: `nav-${direction}` },
            })),
          ].map((element) =>
            labeled && element.type === "rectangle"
              ? { ...element, label: { text: element.id, fontFamily: 2 } }
              : element,
          ),
          { regenerateIds: false },
        );
        if (
          graph
            .filter((el) => el.type === "arrow")
            .some((el) => !el.startBinding || !el.endBinding)
        ) {
          throw Error("Invalid flowchart fixture bindings");
        }
        window.__testAPI.updateScene({
          elements: graph,
          appState: {
            selectedElementIds: {},
            activeTool: {
              type: "selection",
              customType: null,
              locked: false,
              lastActiveTool: null,
            },
            viewModeEnabled: false,
            openPopup: null,
          },
          captureUpdate: "NEVER",
        });
        return graph.map(({ id, x, y }) => ({ id, x, y }));
      }, labeled);
      for (const mode of ["full", "tray", "compact"]) {
        await page.evaluate((mode) => {
          window.__navigationDispose?.();
          const lib = window.__testLibrary;
          window.__navigationDispose = lib.configureObsidianCommonHost({
            protocolVersion: lib.OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
            getDeviceInfo: () => null,
            getDesktopUIMode: () => mode,
            getPreferredUIMode: () => mode,
            getCanvasLimits: () => ({
              areaLimit: 16777216,
              widthHeightLimit: 32767,
            }),
            getHighlightColor: () => "#fff",
          });
          window.__testAPI.setDesktopUIMode(mode);
        }, mode);
        await page.waitForFunction(
          (mode) =>
            window.__testAPI.getEditorInterface().desktopUIMode === mode,
          mode,
        );
        for (const direction of ["up", "down", "left", "right"]) {
          await page.evaluate(() => {
            const api = window.__testAPI;
            api.updateScene({
              appState: { selectedElementIds: {} },
              captureUpdate: "NEVER",
            });
            api.setViewport({
              target: api.getSceneElements(),
              animation: false,
            });
          });
          const clickPoint = await page.evaluate(() => {
            const st = window.__testAPI.getAppState();
            const x = (300 + st.scrollX) * st.zoom.value + st.offsetLeft;
            const y = (310 + st.scrollY) * st.zoom.value + st.offsetTop;
            if (
              document.elementFromPoint(x, y) !==
              document.querySelector("#root canvas.interactive")
            ) {
              throw Error("Flowchart node is covered");
            }
            return { x, y };
          });
          await page.mouse.click(clickPoint.x, clickPoint.y);
          await page.waitForFunction(
            () =>
              window.__testAPI.getAppState().selectedElementIds["nav-center"],
          );
          await page.keyboard.press(
            `Alt+Arrow${direction[0].toUpperCase()}${direction.slice(1)}`,
          );
          const selected = await page.evaluate(() =>
            Object.keys(window.__testAPI.getAppState().selectedElementIds),
          );
          if (selected.length !== 1 || selected[0] !== `nav-${direction}`) {
            const diagnostic = await page.evaluate(() => ({
              active: document.activeElement?.outerHTML?.slice(0, 500),
              graph: window.__testAPI
                .getSceneElements()
                .map(
                  ({
                    id,
                    type,
                    x,
                    y,
                    width,
                    height,
                    startBinding,
                    endBinding,
                  }) => ({
                    id,
                    type,
                    x,
                    y,
                    width,
                    height,
                    startBinding,
                    endBinding,
                  }),
                ),
            }));
            assert.deepEqual(
              selected,
              [`nav-${direction}`],
              `Alt/Option+Arrow${direction} ${JSON.stringify(diagnostic)}`,
            );
          }
          evidence.push({ mode, labeled, direction, selected });
        }
      }
      assert.deepEqual(
        await page.evaluate(() =>
          window.__testAPI
            .getSceneElements()
            .map(({ id, x, y }) => ({ id, x, y })),
        ),
        positions,
        "Navigation moved flowchart elements",
      );
    }
    return evidence;
  } finally {
    await page.keyboard.up("Alt");
    await page.evaluate((scene) => {
      const api = window.__testAPI;
      window.__navigationDispose?.();
      delete window.__navigationDispose;
      // Cancel navigation's viewport animation before restoring the caller.
      api.setViewport({
        target: { x: 0, y: 0, width: 100, height: 100 },
        animation: false,
      });
      api.updateScene({
        elements: scene.elements,
        appState: scene.appState,
        captureUpdate: "NEVER",
      });
      api.setDesktopUIMode(scene.mode);
    }, original);
    await page.waitForFunction((scene) => {
      const st = window.__testAPI.getAppState();
      return (
        st.scrollX === scene.appState.scrollX &&
        st.scrollY === scene.appState.scrollY &&
        st.zoom.value === scene.appState.zoom.value
      );
    }, original);
  }
}
