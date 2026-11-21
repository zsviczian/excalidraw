/**
 * zsviczian -- real keyboard color selection in a second owning document.
 * Author: zsviczian. References: plugin issue #3061 and upstream PR #11997.
 * Uses the actual artifact, Radix focus scope and private shared React runtime.
 * https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/3061
 * https://github.com/excalidraw/excalidraw/pull/11997
 */
import assert from "node:assert/strict";

export async function verifyColorShortcuts(page, modifier) {
  const original = await page.evaluate(() =>
    JSON.stringify(window.__testAPI.getSceneElements()),
  );
  try {
    await page.evaluate(() => {
      const frame = document.createElement("iframe");
      frame.dataset.colorShortcutProbe = "true";
      frame.style.cssText =
        "position:fixed;inset:0;width:1100px;height:800px;z-index:100000;border:0";
      document.body.append(frame);
      const doc = frame.contentDocument;
      for (const style of document.head.querySelectorAll(
        'style,link[rel="stylesheet"]',
      )) {
        doc.head.append(style.cloneNode(true));
      }
      doc.body.style.margin = "0";
      const host = doc.createElement("div");
      host.style.cssText = "width:1050px;height:750px";
      doc.body.append(host);
      const { React, ReactDOM } = window.__testRuntime;
      const lib = window.__testLibrary;
      window.__colorProbeDispose = lib.configureObsidianCommonHost({
        protocolVersion: lib.OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
        getDeviceInfo: () => null,
        getDesktopUIMode: () => "full",
        getPreferredUIMode: () => "full",
        getCanvasLimits: () => ({
          areaLimit: 16777216,
          widthHeightLimit: 32767,
        }),
        getHighlightColor: () => "#fff",
      });
      const elements = lib.convertToExcalidrawElements([
        {
          type: "text",
          text: "Palette shortcut",
          x: 300,
          y: 150,
          fontFamily: 2,
          strokeColor: "#e03131",
        },
      ]);
      const root = ReactDOM.createRoot(host);
      window.__colorProbe = { frame, root, id: elements[0].id };
      root.render(
        React.createElement(lib.Excalidraw, {
          ownerDocument: doc,
          UIOptions: { dockedSidebarBreakpoint: 800 },
          onExcalidrawAPI: (api) => {
            window.__colorProbe.api = api;
          },
          initialData: {
            elements,
            appState: { selectedElementIds: { [elements[0].id]: true } },
          },
        }),
      );
    });
    await page.waitForFunction(
      () =>
        window.__colorProbe.api &&
        !window.__colorProbe.api.getAppState().isLoading &&
        window.__colorProbe.frame.contentDocument.querySelector(
          "canvas.interactive",
        ),
    );
    await page.evaluate(() => window.__colorProbe.api.setDesktopUIMode("full"));
    await page.waitForFunction(
      () =>
        window.__colorProbe.api.getEditorInterface().desktopUIMode === "full",
    );
    const frame = page.frameLocator("iframe[data-color-shortcut-probe]");
    await frame.locator(".excalidraw-container").focus();
    await page.keyboard.press("s");
    const picker = frame.locator(".color-picker-content");
    await picker.waitFor({ state: "visible" });
    assert.ok(
      await picker.evaluate((el) =>
        el.contains(el.ownerDocument.activeElement),
      ),
      "Radix stole focus from the color picker in its owning document",
    );
    const choice = picker.locator(
      '.color-picker-content--default button[aria-label$="— s"]',
    );
    const expected = (await choice.getAttribute("title")).match(
      /#[0-9a-f]{6}/i,
    )?.[0];
    assert.ok(expected && expected !== "#e03131");
    await page.keyboard.press("s");
    await page.waitForFunction(
      (expected) =>
        window.__colorProbe.api.getSceneElements()[0].strokeColor === expected,
      expected,
    );
    await page.keyboard.press("Escape");
    await picker.waitFor({ state: "hidden" });
    await page.waitForFunction(() => {
      const doc = window.__colorProbe.frame.contentDocument;
      return doc
        .querySelector(".excalidraw-container")
        ?.contains(doc.activeElement);
    });
    assert.equal(
      await page.evaluate(
        () => window.__colorProbe.api.getAppState().activeTool.type,
      ),
      "selection",
    );
    await page.keyboard.press(`${modifier}+z`);
    await page.waitForFunction(
      () =>
        window.__colorProbe.api.getSceneElements()[0].strokeColor === "#e03131",
    );
    await page.keyboard.press(`${modifier}+Shift+z`);
    await page.waitForFunction(
      (expected) =>
        window.__colorProbe.api.getSceneElements()[0].strokeColor === expected,
      expected,
    );
    // Tab can itself choose a different shade/section. Test history first so
    // one Undo means exactly the single recolor above.
    await page.keyboard.press("s");
    await picker.waitFor({ state: "visible" });
    for (const key of ["Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      assert.ok(
        await picker.evaluate((el) =>
          el.contains(el.ownerDocument.activeElement),
        ),
        "Palette Tab navigation escaped its document",
      );
    }
    await page.keyboard.press("Escape");
    await picker.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify(window.__testAPI.getSceneElements()),
      ),
      original,
    );
    return {
      ownerDocumentFocus: true,
      trustedPaletteKeys: true,
      tabNavigation: true,
      undoRedo: true,
      mainSceneUnchanged: true,
    };
  } catch (error) {
    const state = await page.evaluate(() => {
      const probe = window.__colorProbe;
      const doc = probe?.frame.contentDocument;
      return {
        ownerFocus: doc?.activeElement?.outerHTML?.slice(0, 600),
        runtimeFocus: document.activeElement?.outerHTML?.slice(0, 120),
        colors: probe?.api?.getSceneElements().map((el) => el.strokeColor),
        popup: probe?.api?.getAppState().openPopup,
        editing: probe?.api?.getAppState().editingTextElement?.id,
        undoButton: doc?.querySelector('[data-testid="button-undo"]')
          ?.outerHTML,
        hasFocus: doc?.hasFocus(),
        platform: navigator.platform,
      };
    });
    throw new Error(`${error}\nColor shortcut state: ${JSON.stringify(state)}`);
  } finally {
    await page.evaluate(() => {
      window.__colorProbe?.root.unmount();
      window.__colorProbe?.frame.remove();
      delete window.__colorProbe;
      window.__colorProbeDispose?.();
      delete window.__colorProbeDispose;
    });
  }
}
