/**
 * zsviczian -- built-artifact regression for upstream W changes and host links.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/486
 * The host's raw Markdown/link ownership has no standalone upstream equivalent.
 * Actual keyboard input protects full/tray/compact shortcuts in both builds.
 */
import assert from "node:assert/strict";

export async function verifyWrapMerge(page, modifier) {
  const evidence = [];
  // The preceding destructive-unmount probe schedules a replacement React root.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.evaluate(() => {
    window.__wrapMode = "full";
    const lib = window.__testLibrary;
    window.__wrapDispose = lib.configureObsidianCommonHost({
      protocolVersion: lib.OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
      getDeviceInfo: () => null,
      getDesktopUIMode: () => window.__wrapMode,
      getPreferredUIMode: () => window.__wrapMode,
      getCanvasLimits: () => ({ areaLimit: 16777216, widthHeightLimit: 32767 }),
      getHighlightColor: () => "#fff",
    });
  });
  const select = async (ids) => {
    await page.evaluate((ids) => {
      const api = window.__testAPI;
      api.selectElements(
        api.getSceneElements().filter((e) => ids.includes(e.id)),
      );
      document.querySelector(".excalidraw").focus();
    }, ids);
    await page.waitForFunction(
      (ids) =>
        ids.every(
          (id) => window.__testAPI.getAppState().selectedElementIds[id],
        ),
      ids,
    );
  };
  const snapshot = () =>
    page.evaluate(() => window.__testAPI.getSceneElementsIncludingDeleted());
  const key = () => page.keyboard.press("w");
  try {
    for (const mode of ["full", "tray", "compact"]) {
      const ids = await page.evaluate((mode) => {
        const api = window.__testAPI;
        window.__wrapMode = mode;
        api.setDesktopUIMode(mode);
        if (api.getAppState().activeTool.type !== "selection") {
          api.setActiveTool({ type: "selection" });
        }
        const elements = window.__testLibrary.convertToExcalidrawElements([
          {
            type: "text",
            x: 500,
            y: 250,
            text: "caption",
            rawText: "[[note|caption]]",
            link: "[[note]]",
            customData: { host: true },
          },
        ]);
        // The skeleton converter initializes rawText from text; supply the
        // host's parsed/raw distinction after conversion, as Obsidian does.
        elements[0].rawText = "[[note|caption]]";
        api.updateScene({
          elements,
          appState: {
            viewModeEnabled: false,
            selectedElementIds: {},
            openMenu: null,
            openSidebar: null,
          },
          captureUpdate: "NEVER",
        });
        return elements.map((e) => e.id);
      }, mode);
      await page.waitForFunction(
        () => window.__testAPI.getAppState().activeTool.type === "selection",
      );
      await select(ids);
      await key();
      await page.waitForFunction(() =>
        window.__testAPI.getSceneElements().some((e) => e.type === "rectangle"),
      );
      let elements = await snapshot();
      const box = elements.find((e) => e.type === "rectangle");
      assert.equal(box.link, "[[note]]");
      assert.equal(elements.find((e) => e.id === ids[0]).link, null);
      await key();
      await page.waitForFunction(
        (id) =>
          window.__testAPI
            .getSceneElementsIncludingDeleted()
            .find((e) => e.id === id)?.isDeleted,
        box.id,
      );
      elements = await snapshot();
      assert.equal(elements.find((e) => e.id === ids[0]).link, "[[note]]");
      assert.equal(elements.find((e) => e.id === box.id).link, null);
      await key();
      await page.waitForFunction(
        (id) => window.__testAPI.getSceneElements().some((e) => e.id === id),
        box.id,
      );
      assert.equal(
        (await snapshot()).find((e) => e.id === box.id).link,
        "[[note]]",
      );

      // Replacing the selection ends W's ephemeral created-container tracking.
      await select([]);
      await select([box.id]);
      await key();
      await page.waitForFunction(
        (id) =>
          !window.__testAPI.getSceneElements().find((e) => e.id === id)
            ?.containerId,
        ids[0],
      );
      elements = await snapshot();
      assert.equal(elements.find((e) => e.id === box.id).isDeleted, false);
      assert.equal(elements.find((e) => e.id === box.id).link, "[[note]]");
      assert.equal(elements.find((e) => e.id === ids[0]).link, null);
      assert.equal(
        elements.find((e) => e.id === ids[0]).rawText,
        "[[note|caption]]",
      );
      assert.deepEqual(elements.find((e) => e.id === ids[0]).customData, {
        host: true,
      });
      await key();
      await page.waitForFunction(
        ({ text, box }) =>
          window.__testAPI.getSceneElements().find((e) => e.id === text)
            ?.containerId === box,
        { text: ids[0], box: box.id },
      );
      await page.keyboard.press(`${modifier}+z`);
      await page.waitForFunction(
        (id) =>
          !window.__testAPI.getSceneElements().find((e) => e.id === id)
            ?.containerId,
        ids[0],
      );
      await page.keyboard.press(`${modifier}+Shift+z`);
      await page.waitForFunction(
        ({ text, box }) =>
          window.__testAPI.getSceneElements().find((e) => e.id === text)
            ?.containerId === box,
        { text: ids[0], box: box.id },
      );

      const frameIds = await page.evaluate(() => {
        const api = window.__testAPI;
        const elements = window.__testLibrary.convertToExcalidrawElements([
          {
            type: "rectangle",
            x: 400,
            y: 200,
            width: 300,
            height: 200,
            customData: { host: true },
          },
          {
            type: "ellipse",
            x: 450,
            y: 250,
            width: 50,
            height: 50,
            link: "[[inside]]",
          },
          { type: "diamond", x: 650, y: 350, width: 100, height: 100 },
          {
            type: "frame",
            children: [],
            x: 520,
            y: 280,
            width: 30,
            height: 30,
            frameRole: "marker",
          },
        ]);
        elements.find((e) => e.type === "frame").frameRole = "marker";
        api.updateScene({ elements, captureUpdate: "NEVER" });
        return elements.map((e) => e.id);
      });
      await select([frameIds[0]]);
      await key();
      await page.waitForFunction(() =>
        window.__testAPI
          .getSceneElements()
          .some((e) => e.type === "frame" && e.frameRole !== "marker"),
      );
      elements = await snapshot();
      const frame = elements.find(
        (e) => e.type === "frame" && e.frameRole !== "marker",
      );
      assert.equal(
        elements.find((e) => e.id === frameIds[0]).frameId,
        frame.id,
      );
      assert.equal(
        elements.find((e) => e.id === frameIds[1]).frameId,
        frame.id,
      );
      assert.equal(
        elements.find((e) => e.id === frameIds[1]).link,
        "[[inside]]",
      );
      assert.equal(elements.find((e) => e.id === frameIds[2]).frameId, null);
      assert.equal(
        elements.find((e) => e.id === frameIds[3]).frameRole,
        "marker",
      );
      assert.equal(elements.find((e) => e.id === frameIds[3]).frameId, null);
      assert.ok(
        elements.findIndex((e) => e.id === frame.id) <
          elements.findIndex((e) => e.id === frameIds[2]),
      );
      await page.keyboard.press(`${modifier}+z`);
      await page.waitForFunction(
        (id) =>
          !window.__testAPI.getSceneElements().find((e) => e.id === id)
            ?.frameId,
        frameIds[0],
      );
      await page.keyboard.press(`${modifier}+Shift+z`);
      await page.waitForFunction(
        ({ id, frame }) =>
          window.__testAPI.getSceneElements().find((e) => e.id === id)
            ?.frameId === frame,
        { id: frameIds[1], frame: frame.id },
      );
      evidence.push({
        mode,
        linkOwnership: true,
        rawMarkdown: true,
        retainedContainers: true,
        interiorDiscovery: true,
        markerExcluded: true,
        stacking: true,
        undoRedo: true,
      });
    }
    return { checks: evidence };
  } finally {
    await page.evaluate(() => {
      window.__wrapDispose();
      delete window.__wrapDispose;
      delete window.__wrapMode;
      window.__testAPI.setDesktopUIMode("full");
    });
  }
}
