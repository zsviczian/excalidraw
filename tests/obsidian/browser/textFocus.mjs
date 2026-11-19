/**
 * zsviczian -- PR #491: blur handlers, Markdown sync and trusted text submission.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/491
 * Exercises the actual production/development artifacts with private React.
 */
import assert from "node:assert/strict";

export async function verifyTextFocus(page, modifier) {
  const editor = page.locator("textarea.excalidraw-wysiwyg");
  const open = async () => {
    await page.evaluate(() => {
      if (window.__testAPI.getAppState().activeTool.type !== "selection") {
        window.__testAPI.setActiveTool({ type: "selection" });
      }
    });
    await page.waitForFunction(
      () =>
        window.__testAPI.getAppState().editingTextElement === null &&
        window.__testAPI.getAppState().activeTool.type === "selection",
    );
    const point = await page.evaluate(() => {
      const api = window.__testAPI;
      const text = api.getSceneElements()[0];
      const state = api.getAppState();
      const x =
        state.offsetLeft + (text.x + 5 + state.scrollX) * state.zoom.value;
      const y =
        state.offsetTop + (text.y + 5 + state.scrollY) * state.zoom.value;
      return {
        x,
        y,
        onCanvas: document
          .elementFromPoint(x, y)
          ?.matches("canvas.interactive"),
      };
    });
    assert.ok(point.onCanvas, "Text fixture point is covered by editor UI");
    await page.mouse.dblclick(point.x, point.y);
    try {
      await editor.waitFor({ state: "visible" });
    } catch (error) {
      const state = await page.evaluate(() => ({
        elements: window.__testAPI.getSceneElements(),
        appState: window.__testAPI.getAppState(),
      }));
      throw new Error(`${error}\nText fixture state: ${JSON.stringify(state)}`);
    }
    await page.waitForFunction(
      () =>
        document.activeElement ===
        document.querySelector("textarea.excalidraw-wysiwyg"),
    );
  };
  try {
    await page.evaluate(() => {
      window.__testRoot.unmount();
      window.__testAPI = null;
      const lib = window.__testLibrary;
      window.__focusSubmissions = [];
      window.__focusDispose = lib.configureObsidianExcalidrawHost({
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
        shouldSyncElementLinkWithText: () => false,
        loadFontFromFile: async () => undefined,
        getMermaid: async () => {
          throw Error("Text focus must not load Mermaid");
        },
        runAction() {},
        prepareMermaidSVGInsert: async (_id, diagram) => diagram,
        getLabel: (key) => key,
        attachInlineLinkSuggester: () => ({
          isBlockingKeys: () => false,
          close() {},
        }),
      });
      const { React, ReactDOM } = window.__testRuntime;
      window.__testRoot = ReactDOM.createRoot(document.getElementById("root"));
      window.__testRoot.render(
        React.createElement(lib.Excalidraw, {
          ownerDocument: document,
          initialData: {
            elements: lib
              .convertToExcalidrawElements(
                [
                  {
                    type: "text",
                    id: "pr491-text",
                    text: "Label",
                    rawText: "[[Note|Label]]",
                    x: 600,
                    y: 300,
                    fontFamily: 2,
                  },
                ],
                { regenerateIds: false },
              )
              .map((element) => ({ ...element, rawText: "[[Note|Label]]" })),
            appState: { scrollX: 0, scrollY: 0 },
          },
          onBeforeTextEdit: (element) => element.rawText,
          onBeforeTextSubmit: (_element, _text, source) => {
            window.__focusSubmissions.push(source);
            return { updatedNextOriginalText: source, nextLink: "" };
          },
          onExcalidrawAPI: (api) => {
            window.__testAPI = api;
          },
        }),
      );
    });
    await page.waitForFunction(
      () =>
        window.__testAPI &&
        !window.__testAPI.getAppState().isLoading &&
        window.__testAPI
          .getSceneElements()
          .some((element) => element.id === "pr491-text"),
    );
    await open();
    assert.equal(await editor.inputValue(), "[[Note|Label]]");

    // Playwright's headless focus emulation keeps every page focused. Exercise
    // the blur handlers here; OS focus changes require the native Obsidian lane.
    await page.evaluate(() => {
      document
        .querySelector("textarea.excalidraw-wysiwyg")
        .dispatchEvent(new FocusEvent("blur"));
      window.dispatchEvent(new Event("blur"));
    });
    assert.equal(await editor.inputValue(), "[[Note|Label]]");
    assert.equal(
      await page.evaluate(
        () => window.__testAPI.getAppState().editingTextElement?.id,
      ),
      "pr491-text",
    );
    assert.deepEqual(await page.evaluate(() => window.__focusSubmissions), []);

    await page.evaluate(() => {
      const api = window.__testAPI;
      api.updateScene({
        elements: api.getSceneElements().map((element) => ({
          ...element,
          version: element.version + 1,
          text: "Fresh label",
          originalText: "Fresh label",
          rawText: "[[Fresh|Fresh label]]",
        })),
      });
    });
    assert.equal(await editor.inputValue(), "[[Fresh|Fresh label]]");
    await page.keyboard.press("End");
    await page.keyboard.type("!");
    await page.keyboard.press(`${modifier}+Enter`);
    await editor.waitFor({ state: "detached" });
    assert.deepEqual(await page.evaluate(() => window.__focusSubmissions), [
      "[[Fresh|Fresh label]]!",
    ]);
    assert.equal(
      await page.evaluate(() => window.__testAPI.getSceneElements()[0].rawText),
      "[[Fresh|Fresh label]]!",
    );

    await open();
    await page.evaluate(() => {
      const api = window.__testAPI;
      api.updateScene({
        elements: api.getSceneElements().map((element) => ({
          ...element,
          isDeleted: true,
          version: element.version + 1,
        })),
      });
    });
    await editor.waitFor({ state: "detached" });
    assert.equal(
      await page.evaluate(() => window.__testAPI.getSceneElements().length),
      0,
    );

    await page.evaluate(() =>
      window.__testAPI.updateScene({
        elements: window.__testLibrary
          .convertToExcalidrawElements([
            {
              type: "text",
              text: "Last label",
              rawText: "[[Last|Last label]]",
              x: 600,
              y: 300,
              fontFamily: 2,
            },
          ])
          .map((element) => ({ ...element, rawText: "[[Last|Last label]]" })),
      }),
    );
    await open();
    const submitted = await page.evaluate(
      () => window.__focusSubmissions.length,
    );
    await page.evaluate(() => window.__testRoot.unmount());
    await editor.waitFor({ state: "detached" });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("blur"));
      window.dispatchEvent(new Event("beforeunload"));
    });
    assert.equal(
      await page.evaluate(() => window.__focusSubmissions.length),
      submitted,
    );
    return {
      windowBlurHandlers: true,
      externalMarkdown: true,
      trustedSubmit: true,
      deletedTextNotResurrected: true,
      unmountDoesNotSubmit: true,
    };
  } finally {
    await page.bringToFront();
    await page.evaluate(() => {
      window.__testRoot.unmount();
      window.__testAPI = null;
      window.__focusDispose?.();
      delete window.__focusDispose;
      delete window.__focusSubmissions;
      const { React, ReactDOM } = window.__testRuntime;
      window.__testRoot = ReactDOM.createRoot(document.getElementById("root"));
      window.__testRoot.render(
        React.createElement(window.__testLibrary.Excalidraw, {
          ownerDocument: document,
          onExcalidrawAPI: (api) => {
            window.__testAPI = api;
          },
        }),
      );
    });
    await page.waitForFunction(
      () => window.__testAPI && !window.__testAPI.getAppState().isLoading,
    );
  }
}
