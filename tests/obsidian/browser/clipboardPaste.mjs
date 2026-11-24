/**
 * zsviczian -- PR #497: exercise the clipboard contracts through the built editor.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/497
 */
import assert from "node:assert/strict";

export async function verifyClipboardPaste(page, modifier) {
  const original = await page.evaluate(() => {
    const api = window.__testAPI;
    const root = document.getElementById("root");
    const lib = window.__testLibrary;
    window.__clipboardHost = lib.configureObsidianExcalidrawHost({
      protocolVersion: lib.OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
      getZoomStep: () => 0.1,
      getZoomMin: () => 0.1,
      getZoomMax: () => 30,
      getZoomToFitMaxLevel: () => 10,
      isDoubleTapEraserEnabled: () => false,
      isPenModeCrosshairVisible: () => false,
      isSingleFingerPanningEnabled: () => false,
      isDoubleClickTextEditingDisabled: () => false,
      isContextMenuDisabled: () => false,
      shouldSyncElementLinkWithText: () => true,
      loadFontFromFile: async () => undefined,
      getMermaid: async () => {
        throw Error("Plain and Markdown text must not load Mermaid");
      },
      runAction() {},
      prepareMermaidSVGInsert: async (_id, diagram) => diagram,
      getLabel: (key) => key,
      attachInlineLinkSuggester: () => ({
        isBlockingKeys: () => false,
        close() {},
      }),
    });
    return {
      elements: api.getSceneElements(),
      mode: api.getEditorInterface().desktopUIMode,
      width: root.style.width,
    };
  });
  const paste = (text) =>
    page.evaluate((value) => {
      const doc = document;
      const data = new DataTransfer();
      data.setData("text/plain", value);
      doc.activeElement.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      );
    }, text);
  const texts = () =>
    page.evaluate(() =>
      window.__testAPI.getSceneElements().map(({ rawText }) => rawText),
    );
  const action = page.getByRole("button", {
    name: "Split into separate text elements",
  });
  const evidence = [];
  try {
    for (const [mode, width] of [
      ["full", 900],
      ["tray", 900],
      ["mobile", 360],
    ]) {
      await page.evaluate(
        ({ mode, width }) => {
          const api = window.__testAPI;
          const lib = window.__testLibrary;
          window.__clipboardLayout?.();
          window.__clipboardLayout = lib.configureObsidianCommonHost({
            protocolVersion: lib.OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
            getDeviceInfo: () => ({
              isDesktop: mode !== "mobile",
              isMobile: mode === "mobile",
              isTablet: false,
            }),
            getDesktopUIMode: () => (mode === "tray" ? "tray" : "full"),
            getPreferredUIMode: () => mode,
            getCanvasLimits: () => ({
              areaLimit: 16777216,
              widthHeightLimit: 32767,
            }),
            getHighlightColor: () => "#fff",
          });
          document.getElementById("root").style.width = `${width}px`;
          api.setDesktopUIMode(mode === "tray" ? "tray" : "full");
          api.updateScene({
            elements: [],
            appState: { selectedElementIds: {}, viewModeEnabled: false },
            captureUpdate: "NEVER",
          });
          api.setToast(null);
        },
        { mode, width },
      );
      await page.waitForFunction(
        ({ mode }) => {
          const ui = window.__testAPI.getEditorInterface();
          return mode === "mobile"
            ? ui.formFactor === "phone"
            : ui.formFactor === "desktop" && ui.desktopUIMode === mode;
        },
        { mode },
      );
      await page
        .locator("canvas.interactive")
        .click({ position: { x: 120, y: 300 } });
      await paste("First line\nSecond line");
      await action.waitFor({ state: "visible" });
      assert.deepEqual(await texts(), ["First line\nSecond line"]);
      await action.click();
      await page.waitForFunction(
        () => window.__testAPI.getSceneElements().length === 2,
      );
      assert.deepEqual(await texts(), ["First line", "Second line"]);
      assert.equal(await action.count(), 0);
      await page.keyboard.press(`${modifier}+z`);
      await page.waitForFunction(
        () => window.__testAPI.getSceneElements().length === 1,
      );
      assert.deepEqual(await texts(), ["First line\nSecond line"]);

      await paste("[[Note one|First]]\n![[image.png]]\n[Second](another.md)");
      await page.waitForFunction(
        () => window.__testAPI.getSceneElements().length === 4,
      );
      assert.deepEqual((await texts()).slice(1), [
        "[[Note one|First]]",
        "![[image.png]]",
        "[Second](another.md)",
      ]);
      assert.equal(await action.count(), 0);
      evidence.push({ mode, splitUndo: true, markdownSourcePerLine: true });
    }
    return evidence;
  } finally {
    await page.evaluate(({ elements, mode, width }) => {
      window.__clipboardHost();
      window.__clipboardLayout?.();
      delete window.__clipboardHost;
      delete window.__clipboardLayout;
      document.getElementById("root").style.width = width;
      const api = window.__testAPI;
      api.setToast(null);
      api.setDesktopUIMode(mode);
      api.updateScene({
        elements,
        appState: { selectedElementIds: {} },
        captureUpdate: "NEVER",
      });
    }, original);
  }
}
