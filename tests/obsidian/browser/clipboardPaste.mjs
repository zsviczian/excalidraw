/**
 * zsviczian -- Exercise Obsidian's Markdown imports and remembered text paste
 * through the built editor. https://github.com/zsviczian/excalidraw/pull/499
 */
import assert from "node:assert/strict";

const pastePreference = "excalidraw-paste-text-as-lines";

export async function verifyClipboardPaste(page, modifier) {
  const original = await page.evaluate((key) => {
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
      preference: localStorage.getItem(key),
    };
  }, pastePreference);
  const paste = async (text) => {
    const point = await page
      .locator("canvas.interactive")
      .evaluate((canvas) => {
        const { x, y, width, height } = canvas.getBoundingClientRect();
        for (const row of [0.45, 0.55, 0.65]) {
          for (const column of [0.5, 0.6, 0.4, 0.7]) {
            const px = x + width * column;
            const py = y + height * row;
            if (document.elementFromPoint(px, py) === canvas) {
              return { x: px, y: py };
            }
          }
        }
        throw Error("No visible paste target on the editor canvas");
      });
    await page.mouse.move(point.x, point.y);
    await page.evaluate((value) => {
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
  };
  const texts = () =>
    page.evaluate(() =>
      window.__testAPI.getSceneElements().map(({ rawText }) => rawText),
    );
  const action = page.getByRole("button", {
    name: "Split into separate text elements",
  });
  const join = page.getByRole("button", {
    name: "Paste as a single text element",
  });
  const readPreference = () =>
    page.evaluate((key) => localStorage.getItem(key), pastePreference);
  const waitForCount = async (count) => {
    await page
      .waitForFunction(
        (expected) => window.__testAPI.getSceneElements().length === expected,
        count,
      )
      .catch(async (error) => {
        throw new Error(
          `Expected ${count} clipboard elements, got ${JSON.stringify(
            await texts(),
          )}`,
          { cause: error },
        );
      });
  };
  const evidence = [];
  try {
    for (const [mode, width] of [
      ["full", 900],
      ["tray", 900],
      ["mobile", 360],
    ]) {
      await page.evaluate(
        ({ mode, width, key }) => {
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
          localStorage.removeItem(key);
        },
        { mode, width, key: pastePreference },
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
      await waitForCount(2);
      assert.deepEqual(await texts(), ["First line", "Second line"]);
      assert.equal(await action.count(), 0);
      assert.equal(await readPreference(), mode === "mobile" ? null : "true");
      await page.keyboard.press(`${modifier}+z`);
      await waitForCount(1);
      assert.deepEqual(await texts(), ["First line\nSecond line"]);

      if (mode === "mobile") {
        await page.evaluate(
          (key) => localStorage.setItem(key, "true"),
          pastePreference,
        );
        await paste("Phone line\nStill together");
        await action.waitFor({ state: "visible" });
        assert.deepEqual((await texts()).slice(1), [
          "Phone line\nStill together",
        ]);
        await action.click();
        await waitForCount(3);
        assert.equal(await readPreference(), "true");
      } else {
        await paste("Cafe\u0301\n\nNext line");
        await join.waitFor({ state: "visible" });
        assert.deepEqual((await texts()).slice(1), ["Cafe\u0301", "Next line"]);
        await join.click();
        await waitForCount(2);
        assert.deepEqual((await texts()).slice(1), ["Cafe\u0301\n\nNext line"]);
        assert.equal(await readPreference(), null);
        await page.keyboard.press(`${modifier}+z`);
        await waitForCount(3);
        assert.deepEqual((await texts()).slice(1), ["Cafe\u0301", "Next line"]);
        await paste("Default restored\nOne element");
        await action.waitFor({ state: "visible" });
        assert.deepEqual((await texts()).slice(3), [
          "Default restored\nOne element",
        ]);
      }

      await page.evaluate(
        (key) => localStorage.setItem(key, "true"),
        pastePreference,
      );
      const beforeMarkdown = (await texts()).length;
      await paste("[[Note one|First]]\n![[image.png]]\n[Second](another.md)");
      await waitForCount(beforeMarkdown + 3);
      assert.deepEqual((await texts()).slice(beforeMarkdown), [
        "[[Note one|First]]",
        "![[image.png]]",
        "[Second](another.md)",
      ]);
      assert.equal(await action.count(), 0);
      assert.equal(await join.count(), 0);
      assert.equal(await readPreference(), "true");
      evidence.push({
        mode,
        splitUndo: true,
        markdownSourcePerLine: true,
        rememberedSplit: mode !== "mobile",
        phoneSplitIsOneTime: mode === "mobile",
      });
    }
    return evidence;
  } finally {
    await page.evaluate(
      ({ elements, mode, width, preference, key }) => {
        window.__clipboardHost();
        window.__clipboardLayout?.();
        delete window.__clipboardHost;
        delete window.__clipboardLayout;
        document.getElementById("root").style.width = width;
        if (preference === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, preference);
        }
        const api = window.__testAPI;
        api.setToast(null);
        api.setDesktopUIMode(mode);
        api.updateScene({
          elements,
          appState: { selectedElementIds: {} },
          captureUpdate: "NEVER",
        });
      },
      { ...original, key: pastePreference },
    );
  }
}
