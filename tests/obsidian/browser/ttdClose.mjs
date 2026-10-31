/** zsviczian -- real built-dialog layout and trusted close input, independent of upstream helpers. */
import assert from "node:assert/strict";

export async function verifyTTDClose(page) {
  await page.evaluate(async () => {
    const lib = window.__testLibrary;
    window.__disposeTTDHost = lib.configureObsidianExcalidrawHost({
      protocolVersion: lib.OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
      isDoubleTapEraserEnabled: () => false,
      getZoomToFitMaxLevel: () => 2,
      isPenModeCrosshairVisible: () => false,
      isSingleFingerPanningEnabled: () => false,
      isDoubleClickTextEditingDisabled: () => false,
      getZoomStep: () => 0.1,
      getZoomMin: () => 0.1,
      getZoomMax: () => 30,
      isContextMenuDisabled: () => false,
      shouldSyncElementLinkWithText: () => false,
      loadFontFromFile: async () => undefined,
      getMermaid: async () => ({
        loaded: true,
        api: Promise.resolve({
          parseMermaidToExcalidraw: async () => ({
            elements: [
              { type: "rectangle", x: 0, y: 0, width: 100, height: 80 },
            ],
          }),
        }),
      }),
      runAction: () => {},
      getLabel: (key) => key,
      attachInlineLinkSuggester: () => ({
        isBlockingKeys: () => false,
        close: () => {},
      }),
    });
    const { React } = window.__testRuntime;
    document.getElementById("root").style.width = "100vw";
    window.__testRoot.render(
      React.createElement(
        lib.Excalidraw,
        {
          ownerDocument: document,
          onExcalidrawAPI: (api) => {
            if (api) window.__testAPI = api;
          },
        },
        React.createElement(lib.TTDDialog, {
          onTextSubmit: async () => {
            throw Error("Close must not submit");
          },
          persistenceAdapter: {
            loadChats: async () => [],
            saveChats: async () => {},
          },
        }),
      ),
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  const evidence = [];
  const scene = await page.evaluate(() =>
    JSON.stringify(window.__testAPI.getSceneElements()),
  );
  const open = (tab) =>
    page.evaluate(
      (tab) =>
        window.__testAPI.updateScene({
          appState: { openDialog: { name: "ttd", tab } },
        }),
      tab,
    );
  try {
    for (const width of [1200, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const tab of ["mermaid", "text-to-diagram"]) {
        await open(tab);
        const close = page.locator(".ttd-dialog .Dialog__close");
        await close.waitFor({ state: "visible" });
        // Modal opening animates scale. Measure the settled, actionable button.
        await close.click({ trial: true });
        assert.equal(await close.count(), 1);
        assert.equal(await close.getAttribute("aria-label"), "Close");
        const geometry = await close.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          const island = button.closest(".Island").getBoundingClientRect();
          const tabs = [
            ...button.closest(".ttd-dialog").querySelectorAll('[role="tab"]'),
          ].map((el) => el.getBoundingClientRect());
          return {
            rect: rect.toJSON(),
            island: island.toJSON(),
            fullscreen: !!button.closest(".Dialog--fullscreen"),
            visible:
              rect.width >= 24 &&
              rect.height >= 24 &&
              rect.left >= island.left &&
              rect.right <= island.right &&
              rect.top >= island.top &&
              rect.bottom <= island.bottom,
            topRight:
              island.right - rect.right <= 40 && rect.top - island.top <= 40,
            clearOfTabs: tabs.every(
              (tab) =>
                rect.bottom <= tab.top ||
                rect.top >= tab.bottom ||
                rect.right <= tab.left ||
                rect.left >= tab.right,
            ),
          };
        });
        assert.equal(
          geometry.visible,
          true,
          JSON.stringify({ width, tab, geometry }),
        );
        assert.equal(geometry.topRight, true);
        assert.equal(
          geometry.clearOfTabs,
          true,
          JSON.stringify({ width, tab, geometry }),
        );
        assert.equal(geometry.fullscreen, width === 390);
        await close.evaluate((button) =>
          button.addEventListener(
            "click",
            (event) => {
              window.__ttdCloseTrusted = event.isTrusted;
            },
            { once: true },
          ),
        );
        await close.click();
        await close.waitFor({ state: "detached" });
        assert.equal(await page.evaluate(() => window.__ttdCloseTrusted), true);
        assert.equal(
          await page.evaluate(() => window.__testAPI.getAppState().openDialog),
          null,
        );
        assert.equal(
          await page.evaluate(() =>
            JSON.stringify(window.__testAPI.getSceneElements()),
          ),
          scene,
        );
        evidence.push({
          width,
          tab,
          ...geometry,
          trustedClick: true,
          scenePreserved: true,
        });
      }
    }
    await open("mermaid");
    const close = page.locator(".ttd-dialog .Dialog__close");
    await close.waitFor({ state: "visible" });
    await close.focus();
    await page.keyboard.press("Enter");
    await close.waitFor({ state: "detached" });
    await open("text-to-diagram");
    await close.waitFor({ state: "visible" });
    await close.focus();
    await page.keyboard.press("Escape");
    await close.waitFor({ state: "detached" });
    return { layouts: evidence, keyboard: ["Enter", "Escape"] };
  } finally {
    await page.evaluate(() => {
      window.__testAPI.updateScene({ appState: { openDialog: null } });
      window.__disposeTTDHost();
      delete window.__disposeTTDHost;
      delete window.__ttdCloseTrusted;
      document.getElementById("root").style.width = "900px";
    });
    await page.setViewportSize({ width: 1200, height: 900 });
  }
}
