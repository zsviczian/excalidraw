// zsviczian -- actual built artifacts, canvas decoding and owner-document checks, fork #477.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { build } from "esbuild";
import { chromium } from "playwright";

import { sourceIdentity } from "../provenance.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const output = resolve(
  process.env.EXCALIDRAW_TEST_REPORT_DIR ||
    join(root, ".test-work/reports/browser"),
);
const artifactRoot = join(root, "packages/excalidraw/dist/obsidian");
mkdirSync(output, { recursive: true });
const tests = [];
const hashes = {};
const resources = new Map();
const report = {
  source: sourceIdentity(root),
  schemaVersion: 2,
  suiteId: "fork-browser",
  status: "failed",
  cleanup: "not-started",
  tests,
  artifacts: hashes,
  toolchain: { node: process.version, platform: process.platform },
};
report.browserErrors = [];
let browser;
let server;
try {
  for (const mode of ["production", "development"]) {
    const jsName =
      mode === "production"
        ? "excalidraw.production.min.js"
        : "excalidraw.development.js";
    const cssName =
      mode === "production"
        ? "excalidraw.production.min.css"
        : "excalidraw.development.css";
    for (const name of [jsName, cssName]) {
      const bytes = readFileSync(join(artifactRoot, name));
      hashes[name] = createHash("sha256").update(bytes).digest("hex");
    }
    resources.set(`/${mode}.js`, {
      mime: "text/javascript",
      bytes: readFileSync(join(artifactRoot, jsName)),
    });
    resources.set(`/${mode}.css`, {
      mime: "text/css",
      bytes: readFileSync(join(artifactRoot, cssName)),
    });
    const bundle = await build({
      absWorkingDir: root,
      stdin: {
        resolveDir: root,
        contents: `import * as React from 'react';import * as ReactDOM from 'react-dom';import * as ReactDOMClient from 'react-dom/client';import * as JSX from 'react/jsx-runtime';import * as JSXDEV from 'react/jsx-dev-runtime';window.__testRuntime={React,ReactDOM:{...ReactDOM,...ReactDOMClient},JSX,JSXDEV};`,
      },
      bundle: true,
      write: false,
      platform: "browser",
      format: "iife",
      define: { "process.env.NODE_ENV": JSON.stringify(mode) },
      logLevel: "silent",
    });
    resources.set(`/${mode}-react.js`, {
      mime: "text/javascript",
      bytes: bundle.outputFiles[0].contents,
    });
  }
  resources.set("/", {
    mime: "text/html",
    bytes: Buffer.from(
      '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><div id="root" style="width:900px;height:700px"></div></body></html>',
    ),
  });
  server = createServer((request, response) => {
    const resource = resources.get(request.url);
    if (!resource) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { "Content-Type": resource.mime });
    response.end(resource.bytes);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  browser = await chromium.launch({ headless: true });
  report.browser = browser.version();
  for (const mode of ["production", "development"]) {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 900 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    const external = [];
    page.on("pageerror", (error) => {
      errors.push(String(error));
      report.browserErrors.push(String(error));
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        report.browserErrors.push(message.text());
      }
    });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (
        ["data:", "blob:", "about:"].includes(url.protocol) ||
        url.hostname === "127.0.0.1"
      ) {
        return route.continue();
      }
      external.push(url.href);
      return route.abort();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.addScriptTag({ url: `/${mode}-react.js` });
    await page.addStyleTag({ url: `/${mode}.css` });
    const payload = resources.get(`/${mode}.js`).bytes.toString();
    await page.evaluate((source) => {
      const { React, ReactDOM, JSX, JSXDEV } = window.__testRuntime;
      if (typeof ReactDOM.unstable_batchedUpdates !== "function") {
        throw Error(
          "private ReactDOM host is missing the official batching API",
        );
      }
      // zsviczian -- evaluate the exact built Obsidian payload with private React, as its consumer does.
      // eslint-disable-next-line no-new-func
      window.__testLibrary = new Function(
        "React",
        "ReactDOM",
        "ReactJSXRuntime",
        "ReactJSXDevRuntime",
        `${source};return ExcalidrawLib;`,
      )(React, ReactDOM, JSX, JSXDEV);
    }, payload);
    const run = async (name, execute, driver = false) => {
      const testId = `fork-browser:${mode}:${name}`;
      try {
        const evidence = await (driver ? execute() : page.evaluate(execute));
        tests.push({
          testId,
          featureIds: ["P01", "P03", "P09"],
          status: "passed",
          evidence,
        });
      } catch (error) {
        tests.push({
          testId,
          status: "failed",
          reason: String(error.stack || error),
        });
        throw error;
      }
    };
    await run("real-editor-roundtrip", async () => {
      const { React, ReactDOM } = window.__testRuntime;
      const lib = window.__testLibrary;
      const elements = lib.convertToExcalidrawElements([
        {
          type: "rectangle",
          x: 10,
          y: 20,
          width: 120,
          height: 80,
          backgroundColor: "#ff0000",
          fillStyle: "solid",
          roughness: 0,
          customData: { retained: true },
        },
      ]);
      const root = ReactDOM.createRoot(document.getElementById("root"));
      window.__testRoot = root;
      root.render(
        React.createElement(lib.Excalidraw, {
          ownerDocument: document,
          initialData: { elements },
          onExcalidrawAPI: (api) => {
            window.__testAPI = api;
          },
        }),
      );
      const end = Date.now() + 15000;
      while (!window.__testAPI || !document.querySelector("canvas.static")) {
        if (Date.now() > end) {
          throw Error("real editor did not mount");
        }
        await new Promise((r) => setTimeout(r, 25));
      }
      while (window.__testAPI.getAppState().isLoading) {
        if (Date.now() > end) {
          const state = window.__testAPI.getAppState();
          throw Error(
            `editor did not initialize: ${JSON.stringify({
              width: state.width,
              height: state.height,
              error: String(state.errorMessage),
              text: document.body.textContent.slice(-500),
            })}`,
          );
        }
        await new Promise((r) => setTimeout(r, 25));
      }
      const scene = window.__testAPI.getSceneElements();
      if (scene.length !== 1 || !scene[0].customData.retained) {
        throw Error("scene metadata lost");
      }
      const rect = document
        .querySelector("canvas.static")
        .getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        throw Error("canvas not visible");
      }
      if (window.React || window.ReactDOM || window.h) {
        throw Error("private runtime or test hook leaked globally");
      }
      return { elements: scene.length, width: rect.width, height: rect.height };
    });
    await run(
      "trusted-pointer-and-undo",
      async () => {
        await page.evaluate(() => {
          window.__trustedPointers = [];
          window.__trustedListener = (event) => {
            if (event.target.matches("canvas.interactive")) {
              window.__trustedPointers.push({
                trusted: event.isTrusted,
                pointerType: event.pointerType,
              });
            }
          };
          document.addEventListener(
            "pointerdown",
            window.__trustedListener,
            true,
          );
        });
        try {
          await page.getByTestId("toolbar-rectangle").click();
          await page.waitForFunction(
            () =>
              window.__testAPI.getAppState().activeTool.type === "rectangle",
          );
          await page.mouse.move(500, 350);
          await page.mouse.down();
          await page.mouse.move(650, 450, { steps: 5 });
          await page.mouse.up();
          await page.waitForFunction(
            () => window.__testAPI.getSceneElements().length === 2,
          );
          const authored = await page.evaluate(() => ({
            elements: window.__testAPI
              .getSceneElements()
              .map((e) => ({ type: e.type, width: e.width, height: e.height })),
            pointers: window.__trustedPointers,
          }));
          assert.ok(
            authored.pointers.some(
              (event) => event.trusted && event.pointerType === "mouse",
            ),
            "No trusted canvas pointer event",
          );
          assert.ok(
            authored.elements.some(
              (element) =>
                element.type === "rectangle" &&
                element.width >= 140 &&
                element.height >= 90,
            ),
          );
          await page.keyboard.press("Control+z");
          await page.waitForFunction(
            () => window.__testAPI.getSceneElements().length === 1,
          );
          assert.equal(
            await page.evaluate(
              () => window.__testAPI.getSceneElements()[0].customData?.retained,
            ),
            true,
          );
          return {
            assertions: [
              "real toolbar selects rectangle after its scheduled commit",
              "trusted pointer draws a shape",
              "keyboard undo preserves the original scene",
            ],
            ...authored,
          };
        } finally {
          await page.evaluate(() => {
            document.removeEventListener(
              "pointerdown",
              window.__trustedListener,
              true,
            );
            delete window.__trustedListener;
          });
        }
      },
      true,
    );
    await run("decoded-png-and-svg", async () => {
      const lib = window.__testLibrary;
      const api = window.__testAPI;
      const elements = api.getSceneElements();
      const appState = {
        ...api.getAppState(),
        exportBackground: false,
        exportWithDarkMode: false,
        exportPadding: 0,
      };
      const svg = await lib.exportToSvg({
        elements,
        appState,
        files: {},
        exportPadding: 0,
      });
      if (
        svg.namespaceURI !== "http://www.w3.org/2000/svg" ||
        !svg.querySelector("path,rect")
      ) {
        throw Error("invalid exported SVG");
      }
      const blob = await lib.exportToBlob({
        elements,
        appState,
        files: {},
        mimeType: "image/png",
        exportPadding: 0,
      });
      const decoded = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = decoded.width;
      canvas.height = decoded.height;
      const context = canvas.getContext("2d");
      context.drawImage(decoded, 0, 0);
      const pixel = [
        ...context.getImageData(
          Math.floor(decoded.width / 2),
          Math.floor(decoded.height / 2),
          1,
          1,
        ).data,
      ];
      if (
        decoded.width < 100 ||
        decoded.height < 60 ||
        pixel[0] < 180 ||
        pixel[1] > 80 ||
        pixel[3] < 200
      ) {
        throw Error(`PNG did not decode to expected red shape: ${pixel}`);
      }
      decoded.close();
      return {
        svgWidth: svg.getAttribute("width"),
        width: canvas.width,
        height: canvas.height,
        pixel,
      };
    });
    await run("offline-font-and-unicode-export", async () => {
      const lib = window.__testLibrary;
      const elements = lib.convertToExcalidrawElements([
        {
          type: "text",
          text: "Árvíztűrő offline",
          x: 0,
          y: 0,
          fontFamily: 5,
          fontSize: 28,
        },
      ]);
      await lib.loadSceneFonts(elements);
      const loaded = [...document.fonts].filter(
        (face) =>
          face.family.includes("Excalifont") && face.status === "loaded",
      );
      if (
        !loaded.length ||
        !document.fonts.check('28px "Excalifont"', elements[0].text)
      ) {
        throw Error("actual built-in font did not load offline");
      }
      const svg = await lib.exportToSvg({
        elements,
        files: {},
        appState: { exportBackground: false },
        exportPadding: 0,
      });
      if (
        !svg.textContent.includes("Árvíztűrő") ||
        !svg.outerHTML.includes("data:font/")
      ) {
        throw Error("SVG lost Unicode text or its embedded font");
      }
      const blob = await lib.exportToBlob({
        elements,
        files: {},
        appState: { exportBackground: false, exportWithDarkMode: false },
        mimeType: "image/png",
        exportPadding: 0,
      });
      const image = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      image.close();
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let painted = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 0) {
          painted++;
        }
      }
      if (painted < 50) {
        throw Error("Unicode text export is blank");
      }
      return {
        assertions: [
          "actual Excalifont face loaded",
          "Unicode source preserved",
          "font embedded into SVG",
          "PNG text paints nonempty pixels",
        ],
        fontFaces: loaded.length,
        width: canvas.width,
        height: canvas.height,
        painted,
      };
    });
    await run("two-owning-documents", async () => {
      const { React, ReactDOM } = window.__testRuntime;
      const lib = window.__testLibrary;
      const iframe = document.createElement("iframe");
      iframe.style.width = "500px";
      iframe.style.height = "400px";
      document.body.append(iframe);
      const doc = iframe.contentDocument;
      doc.body.innerHTML =
        '<div id="second" style="width:480px;height:360px"></div>';
      const root = ReactDOM.createRoot(doc.getElementById("second"));
      let api;
      const elements = lib.convertToExcalidrawElements([
        { type: "text", text: "Second Álfa", x: 0, y: 0, fontFamily: 5 },
      ]);
      root.render(
        React.createElement(lib.Excalidraw, {
          ownerDocument: doc,
          onExcalidrawAPI: (value) => {
            api = value;
          },
          initialData: { elements },
        }),
      );
      const end = Date.now() + 15000;
      while (!api || !doc.querySelector("canvas.static")) {
        if (Date.now() > end) {
          throw Error("second document editor missing");
        }
        await new Promise((r) => setTimeout(r, 25));
      }
      if (
        doc.querySelector("canvas.static").ownerDocument !== doc ||
        api === window.__testAPI
      ) {
        throw Error("editor ownership leaked");
      }
      while (
        api.getAppState().isLoading ||
        ![...doc.fonts].some(
          (face) =>
            face.family.includes("Excalifont") && face.status === "loaded",
        )
      ) {
        if (Date.now() > end) {
          throw Error("owning-document font did not load");
        }
        await new Promise((r) => setTimeout(r, 25));
      }
      if (
        window.__testAPI.getSceneElements()[0].type !== "rectangle" ||
        api.getSceneElements()[0].text !== "Second Álfa"
      ) {
        throw Error("cross-editor scene contamination");
      }
      root.unmount();
      iframe.remove();
      if (window.__testAPI.getSceneElements().length !== 1) {
        throw Error("surviving editor changed");
      }
      return { owningDocument: true, survivingElements: 1 };
    });
    await page.screenshot({ path: join(output, `${mode}-editor.png`) });
    await page.evaluate(() => {
      window.__testRoot.unmount();
    });
    assert.deepEqual(
      external,
      [],
      "Offline artifact attempted external resources",
    );
    assert.deepEqual(errors, [], "Built artifact raised a browser error");
    assert.deepEqual(
      report.browserErrors,
      [],
      "Built artifact logged a console error",
    );
    tests.push({
      testId: `fork-browser:${mode}:offline-cleanup`,
      featureIds: ["P11"],
      status: "passed",
      assertions: [
        "no external resources",
        "no page errors",
        "both roots unmounted",
      ],
    });
    await page.close();
  }
  report.status = "passed";
} catch (error) {
  report.error = String(error.stack || error);
} finally {
  try {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    report.cleanup = "passed";
  } catch (error) {
    report.cleanup = "failed";
    report.status = "failed";
    report.cleanupError = String(error);
  }
  writeFileSync(
    join(output, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
process.stdout.write(
  `${report.suiteId}: ${report.status}; ${join(output, "report.json")}\n`,
);
if (report.error) {
  process.stderr.write(`${report.error}\n`);
}
if (report.status !== "passed") {
  process.exitCode = 1;
}
