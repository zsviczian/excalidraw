/**
 * zsviczian -- PR #485: rendered text stability and host-aware caret zoom.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/485
 * Fractional device scaling models raster/layout rounding; physical Electron
 * application zoom and mobile keyboards remain separate native environments.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { compareTextGlyphPixels } from "./textGlyphPixels.mjs";

export async function verifyTextEditing(page, modifier) {
  const session = await page.context().newCDPSession(page);
  const originalViewport = {
    ...page.viewportSize(),
    deviceScaleFactor: await page.evaluate(() => devicePixelRatio),
    mobile: false,
  };
  const capture = async (clip) =>
    Buffer.from(
      (
        await session.send("Page.captureScreenshot", {
          format: "png",
          clip: { ...clip, scale: 1 },
          captureBeyondViewport: false,
        })
      ).data,
      "base64",
    );
  const evidence = [];
  await page.evaluate(() => {
    const lib = window.__testLibrary;
    window.__textPolicy = {
      step: 0.07,
      min: 0.01,
      max: 4,
      mode: "full",
      suggestions: 0,
    };
    const policy = window.__textPolicy;
    window.__textDisposers = [
      lib.configureObsidianCommonHost({
        protocolVersion: lib.OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
        getDeviceInfo: () => null,
        getDesktopUIMode: () => policy.mode,
        getPreferredUIMode: () => policy.mode,
        getCanvasLimits: () => ({
          areaLimit: 16777216,
          widthHeightLimit: 32767,
        }),
        getHighlightColor: () => "#fff",
      }),
      lib.configureObsidianExcalidrawHost({
        protocolVersion: lib.OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,
        getZoomStep: () => policy.step,
        getZoomMin: () => policy.min,
        getZoomMax: () => policy.max,
        getZoomToFitMaxLevel: () => 10,
        isDoubleTapEraserEnabled: () => false,
        isPenModeCrosshairVisible: () => false,
        isSingleFingerPanningEnabled: () => false,
        isDoubleClickTextEditingDisabled: () => false,
        isContextMenuDisabled: () => false,
        shouldSyncElementLinkWithText: () => false,
        loadFontFromFile: async () => undefined,
        getMermaid: async () => {
          throw Error("Text editing must not load Mermaid");
        },
        runAction() {},
        prepareMermaidSVGInsert: async (_id, diagram) => diagram,
        getLabel: (key) => key,
        attachInlineLinkSuggester: () => {
          policy.suggestions++;
          return { isBlockingKeys: () => false, close() {} };
        },
      }),
    ];
  });
  const editor = page.locator("textarea.excalidraw-wysiwyg");
  const open = async (mode, textAlign, fixedWidth = false, bound = false) => {
    await page.evaluate(
      ({ mode, textAlign, fixedWidth, bound }) => {
        const api = window.__testAPI;
        const lib = window.__testLibrary;
        window.__textPolicy.mode = mode;
        api.setDesktopUIMode(mode);
        if (api.getAppState().activeTool.type !== "selection") {
          api.setActiveTool({ type: "selection" });
        }
        const elements = lib.convertToExcalidrawElements(
          bound
            ? [
                {
                  type: "rectangle",
                  id: "pr485-box",
                  x: 600,
                  y: 300,
                  width: 210.46,
                  height: 120,
                  label: { text: "Bound", fontFamily: 2, fontSize: 20 },
                },
              ]
            : [
                {
                  type: "text",
                  id: "pr485-text",
                  x: 600,
                  y: 300,
                  text: "Anchor stays\nx",
                  rawText: "Anchor stays\nx",
                  fontFamily: 2,
                  fontSize: 20,
                  textAlign,
                },
              ],
        );
        const text = elements.find((element) => element.type === "text");
        window.__textId = text.id;
        api.updateScene({
          elements: fixedWidth
            ? [{ ...text, width: 98.46, autoResize: false }]
            : elements,
          appState: {
            selectedElementIds: { [text.id]: true },
            zoom: { value: 1 },
            scrollX: 0,
            scrollY: 0,
            zenModeEnabled: false,
            viewModeEnabled: false,
            theme: "light",
            viewBackgroundColor: "#ffffff",
            openSidebar: null,
            openMenu: null,
          },
          captureUpdate: "NEVER",
        });
      },
      { mode, textAlign, fixedWidth, bound },
    );
    await page.waitForFunction(
      () => window.__testAPI.getAppState().selectedElementIds[window.__textId],
    );
    const center = await page.evaluate(() => {
      const s = window.__testAPI.getAppState();
      const text = window.__testAPI
        .getSceneElements()
        .find((element) => element.id === window.__textId);
      return {
        x: s.offsetLeft + (text.x + text.width / 2 + s.scrollX) * s.zoom.value,
        y: s.offsetTop + (text.y + text.height / 2 + s.scrollY) * s.zoom.value,
      };
    });
    await page.mouse.dblclick(center.x, center.y);
    await editor.waitFor();
    await editor.evaluate(async (input) => {
      await input.ownerDocument.fonts.load(input.style.font);
    });
  };
  const close = async () => {
    await page.keyboard.press("Escape");
    await editor.waitFor({ state: "detached" });
  };
  try {
    for (const mode of ["full", "tray", "compact"]) {
      for (const scale of [0.8, 1, 1.25]) {
        await session.send("Emulation.setDeviceMetricsOverride", {
          width: Math.round(1200 / scale),
          height: Math.round(900 / scale),
          deviceScaleFactor: scale,
          mobile: false,
        });
        for (const align of ["center", "right"]) {
          await open(mode, align);
          const initial = await page.evaluate(() => {
            const api = window.__testAPI;
            const s = api.getAppState();
            const text = api.getSceneElements()[0];
            return {
              x: s.offsetLeft + text.x - 3,
              y: s.offsetTop + text.y - 1,
              width: text.width + 6,
              height: text.fontSize * text.lineHeight - 2,
            };
          });
          await editor.evaluate((input) => {
            input.focus({ preventScroll: true });
            input.setSelectionRange(input.value.length, input.value.length);
          });
          const beforeStyle = await editor.evaluate((input) =>
            input.getAttribute("style"),
          );
          const before = await capture(initial);
          assert.equal(
            await editor.evaluate((input) => {
              const rect = input.getBoundingClientRect();
              return (
                input.ownerDocument.elementFromPoint(
                  rect.x + rect.width / 2,
                  rect.y + 8,
                ) === input
              );
            }),
            true,
            "pixel probe must measure unobscured editor glyphs",
          );
          const ink = await page.evaluate(async (encoded) => {
            const image = new Image();
            image.src = `data:image/png;base64,${encoded}`;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
            const data = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            ).data;
            let count = 0;
            for (let i = 0; i < data.length; i += 4) {
              if (
                data[i + 3] > 0 &&
                data[i] < 200 &&
                data[i + 1] < 200 &&
                data[i + 2] < 200
              ) {
                count++;
              }
            }
            return count;
          }, before.toString("base64"));
          if (ink <= 30) {
            writeFileSync(
              join(
                process.env.EXCALIDRAW_TEST_REPORT_DIR ||
                  ".test-work/reports/browser",
                "text-region-failure.png",
              ),
              before,
            );
            assert.fail(
              JSON.stringify({
                mode,
                scale,
                align,
                ink,
                initial,
                editor: await editor.evaluate((input) => ({
                  value: input.value,
                  rect: input.getBoundingClientRect().toJSON(),
                  style: input.getAttribute("style"),
                  documentScroll: [scrollX, scrollY],
                  viewport: [
                    innerWidth,
                    innerHeight,
                    visualViewport.pageLeft,
                    visualViewport.pageTop,
                  ],
                })),
                state: await page.evaluate(() => ({
                  text: window.__testAPI.getSceneElements()[0],
                  scroll: [
                    window.__testAPI.getAppState().scrollX,
                    window.__testAPI.getAppState().scrollY,
                  ],
                })),
              }),
            );
          }
          await page.keyboard.insertText("mmmmmmmmmmmm");
          await page.waitForFunction(() =>
            window.__testAPI
              .getSceneElements()[0]
              .rawText.endsWith("mmmmmmmmmmmm"),
          );
          const after = await capture(initial);
          // Compare glyph cores, retaining the fringe mask for diagnostics.
          // Exact CI-image and one-pixel displacement controls cover the oracle.
          const pixels = await page.evaluate(
            async (encoded) => {
              const images = await Promise.all(
                encoded.map(async (png) => {
                  const image = new Image();
                  image.src = `data:image/png;base64,${png}`;
                  await image.decode();
                  const canvas = document.createElement("canvas");
                  canvas.width = image.naturalWidth;
                  canvas.height = image.naturalHeight;
                  const context = canvas.getContext("2d");
                  context.drawImage(image, 0, 0);
                  return Array.from(
                    context.getImageData(0, 0, canvas.width, canvas.height)
                      .data,
                  );
                }),
              );
              return images;
            },
            [before.toString("base64"), after.toString("base64")],
          );
          const { masks, stable } = compareTextGlyphPixels(
            pixels[0],
            pixels[1],
          );
          if (!stable) {
            const directory =
              process.env.EXCALIDRAW_TEST_REPORT_DIR ||
              ".test-work/reports/browser";
            writeFileSync(join(directory, "text-before.png"), before);
            writeFileSync(join(directory, "text-after.png"), after);
            writeFileSync(
              join(directory, "text-placement.json"),
              JSON.stringify(
                {
                  mode,
                  scale,
                  align,
                  initial,
                  beforeStyle,
                  afterStyle: await editor.evaluate((input) =>
                    input.getAttribute("style"),
                  ),
                  masks,
                },
                null,
                2,
              ),
            );
          }
          assert.ok(
            stable,
            `${mode}/${scale}/${align}: unchanged first line moved while typing on the second`,
          );
          await close();
          evidence.push({ mode, scale, align, stableFirstLinePixels: true });
        }
        await open(mode, "center", true);
        assert.equal(
          await editor.evaluate((input) => input.style.width),
          "98.46px",
          "wrapping text must retain its fractional width",
        );
        await close();
      }
      await open(mode, "left", false, true);
      const pasteWidth = await editor.evaluate(async (input) => {
        const transfer = new DataTransfer();
        transfer.setData(
          "text/plain",
          "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
        );
        await input.onpaste(
          new ClipboardEvent("paste", {
            clipboardData: transfer,
            cancelable: true,
          }),
        );
        return Number.parseFloat(input.style.width);
      });
      assert.ok(
        pasteWidth > 0 &&
          pasteWidth <= 200.46 &&
          Math.abs(pasteWidth - Math.round(pasteWidth)) > 0.01,
        `bound paste rounded away its fractional wrapping width: ${pasteWidth}`,
      );
      await close();
      await open(mode, "center");
      const sameEditor = await editor.elementHandle();
      const originalValue = await editor.inputValue();
      await editor.evaluate((input) => input.setSelectionRange(3, 3));
      await page.keyboard.press("Alt+w");
      await page.waitForFunction(
        () => window.__testAPI.getSceneElements()[0].autoResize === false,
      );
      assert.equal(
        await editor.evaluate(
          (input, original) => input === original,
          sameEditor,
        ),
        true,
      );
      assert.equal(await editor.inputValue(), originalValue);
      assert.equal(await editor.evaluate((input) => input.selectionStart), 3);
      await page.keyboard.press("Alt+w");
      await page.waitForFunction(
        () => window.__testAPI.getSceneElements()[0].autoResize === true,
      );
      const resizeStart = await page.evaluate(() => {
        const s = window.__testAPI.getAppState();
        const text = window.__testAPI.getSceneElements()[0];
        return {
          x:
            s.offsetLeft + (text.x + text.width + s.scrollX) * s.zoom.value + 4,
          y:
            s.offsetTop + (text.y + text.height / 2 + s.scrollY) * s.zoom.value,
          width: text.width,
          rawText: text.rawText,
        };
      });
      await page.mouse.move(resizeStart.x, resizeStart.y);
      await page.mouse.down();
      await page.mouse.move(resizeStart.x - 40, resizeStart.y, { steps: 6 });
      await page.mouse.up();
      await page.waitForFunction(
        (width) =>
          Math.abs(
            window.__testAPI.getSceneElements()[0].width - (width - 40),
          ) < 2,
        resizeStart.width,
      );
      assert.equal(
        await editor.evaluate(
          (input, original) => input === original,
          sameEditor,
        ),
        true,
      );
      assert.equal(await editor.inputValue(), originalValue);
      assert.equal(
        await page.evaluate(
          () => window.__testAPI.getSceneElements()[0].rawText,
        ),
        resizeStart.rawText,
      );
      await sameEditor.dispose();
      await close();
      evidence.push({ mode, altW: true, resizeKeepsEditorAndRawText: true });
      await open(mode, "left");
      const point = async () =>
        page.evaluate(() => {
          const api = window.__testAPI;
          const s = api.getAppState();
          const text = api.getSceneElements()[0];
          const input = document.querySelector("textarea.excalidraw-wysiwyg");
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          context.font = input.style.font;
          return {
            x:
              (text.x + context.measureText("Anc").width + s.scrollX) *
                s.zoom.value +
              s.offsetLeft,
            y:
              (text.y + (text.fontSize * text.lineHeight) / 2 + s.scrollY) *
                s.zoom.value +
              s.offsetTop,
            zoom: s.zoom.value,
          };
        });
      await editor.evaluate((input) => input.setSelectionRange(3, 3));
      const anchor = await point();
      for (const key of ["=", "=", "-", "0"]) {
        const before = await point();
        await page.keyboard.press(`${modifier}+${key}`);
        const after = await point();
        assert.notEqual(after.zoom, before.zoom, "keyboard zoom did not run");
        assert.ok(
          Math.abs(after.x - anchor.x) < 1 && Math.abs(after.y - anchor.y) < 1,
          `${mode}: caret moved during keyboard zoom`,
        );
        assert.ok(
          Math.abs(
            after.zoom -
              (key === "0" ? 1 : before.zoom + (key === "-" ? -0.07 : 0.07)),
          ) < 0.0001,
          "keyboard zoom lost the custom host step",
        );
      }
      await close();
      evidence.push({ mode, caretAnchor: true, customStep: 0.07 });
    }
    assert.ok(
      await page.evaluate(() => window.__textPolicy.suggestions >= 24),
      "host inline suggester was not attached",
    );
    const countResizeListeners = async () => {
      const { result } = await session.send("Runtime.evaluate", {
        expression: "window",
        objectGroup: "text-resize-probe",
      });
      try {
        const { listeners } = await session.send(
          "DOMDebugger.getEventListeners",
          { objectId: result.objectId },
        );
        const capture = listeners.filter(
          (listener) => listener.type === "pointermove" && listener.useCapture,
        );
        return capture.length;
      } finally {
        await session.send("Runtime.releaseObject", {
          objectId: result.objectId,
        });
      }
    };
    const listenersBefore = await countResizeListeners();
    await open("full", "center");
    const handle = await page.evaluate(() => {
      const s = window.__testAPI.getAppState();
      const text = window.__testAPI.getSceneElements()[0];
      return {
        x: s.offsetLeft + (text.x + text.width + s.scrollX) * s.zoom.value + 4,
        y: s.offsetTop + (text.y + text.height / 2 + s.scrollY) * s.zoom.value,
      };
    });
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    assert.ok(
      (await countResizeListeners()) > listenersBefore,
      "resize drag did not register its capture listener",
    );
    let listenersAfter;
    try {
      await page.evaluate(() => window.__testRoot.unmount());
      listenersAfter = await countResizeListeners();
    } finally {
      await page.mouse.up();
      await page.evaluate(() => {
        const { React, ReactDOM } = window.__testRuntime;
        window.__testRoot = ReactDOM.createRoot(
          document.getElementById("root"),
        );
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
    assert.equal(
      listenersAfter,
      listenersBefore,
      "unmount during text resize retained a window capture listener",
    );
    evidence.push({ unmountCancelsTextResize: true });
    return {
      checks: evidence,
      fractionalWrap: true,
      boundPasteFractionalWidth: true,
      hostSuggester: true,
    };
  } finally {
    await page.keyboard.press("Escape");
    await session.send("Emulation.setDeviceMetricsOverride", originalViewport);
    await session.detach();
    await page.evaluate(() => {
      window.__textDisposers.reverse().forEach((dispose) => dispose());
      delete window.__textDisposers;
      delete window.__textPolicy;
      delete window.__textId;
      window.__testAPI.setDesktopUIMode("full");
    });
  }
}
