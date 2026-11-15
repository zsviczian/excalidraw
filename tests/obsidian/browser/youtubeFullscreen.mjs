/** zsviczian -- plugin #3048: built editor routing and trusted cross-origin fullscreen, with offline provider fixtures. */
import assert from "node:assert/strict";

export async function verifyYouTubeFullscreen(page) {
  const shim = "https://releases.obsidian.md/youtube*";
  const video = "https://www.youtube.com/embed/*";
  const player =
    '<!doctype html><html><body style="margin:0;background:#183048"><button onclick="document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()">Toggle fullscreen</button><script>addEventListener("message",e=>{if(e.data==="ping")e.source.postMessage("pong","*")})</script></body></html>';
  await page.route(shim, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><body style="margin:0"><iframe style="width:100vw;height:100vh;border:0" allowfullscreen src="https://www.youtube.com/embed/offline-player"></iframe></body></html>',
    }),
  );
  await page.route(video, (route) =>
    route.fulfill({ contentType: "text/html", body: player }),
  );
  await page.evaluate(() => {
    const lib = window.__testLibrary;
    const { React, ReactDOM } = window.__testRuntime;
    window.__youtubeDispose = lib.configureObsidianCommonHost({
      protocolVersion: lib.OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
      getDeviceInfo: () => ({
        isDesktop: true,
        isPhone: false,
        isTablet: false,
        isMobile: false,
        isLinux: false,
        isMacOS: false,
        isWindows: true,
        isIOS: false,
        isAndroid: false,
      }),
      getDesktopUIMode: () => "full",
      getPreferredUIMode: () => "full",
      getCanvasLimits: () => ({ areaLimit: 16777216, widthHeightLimit: 32767 }),
      getHighlightColor: () => "#fff",
    });
    const host = document.createElement("div");
    host.id = "youtube-test";
    Object.assign(host.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "10000",
    });
    document.body.append(host);
    window.__youtubeRoot = ReactDOM.createRoot(host);
    window.__youtubeRoot.render(
      React.createElement(lib.Excalidraw, {
        ownerDocument: document,
        renderWebview: true,
        validateEmbeddable: true,
        onExcalidrawAPI: (api) => {
          window.__youtubeAPI = api;
        },
        initialData: {
          elements: lib.convertToExcalidrawElements([
            {
              type: "embeddable",
              id: "youtube-fixture",
              x: 50,
              y: 50,
              width: 480,
              height: 270,
              link: "https://www.youtube.com/watch?v=abcdefghijk",
            },
          ]),
        },
      }),
    );
  });
  const evidence = [];
  try {
    await page.waitForFunction(
      () => window.__youtubeAPI && !window.__youtubeAPI.getAppState().isLoading,
    );
    for (const zoom of [0.5, 2]) {
      await page.evaluate((zoom) => {
        const api = window.__youtubeAPI;
        const element = api.getSceneElements()[0];
        api.updateScene({
          appState: {
            zoom: { value: zoom },
            scrollX: 0,
            scrollY: 0,
            activeEmbeddable: { element, state: "active" },
          },
          captureUpdate: "NEVER",
        });
      }, zoom);
      assert.equal(await page.locator("#youtube-test webview").count(), 0);
      const outer = page.locator("#youtube-test iframe.excalidraw__embeddable");
      await outer.waitFor();
      const embeddedBounds = await outer.boundingBox();
      assert.match(
        await outer.getAttribute("src"),
        /^https:\/\/releases\.obsidian\.md\/youtube\?/,
      );
      const button = page
        .frameLocator("#youtube-test iframe.excalidraw__embeddable")
        .frameLocator("iframe")
        .getByRole("button", { name: "Toggle fullscreen" });
      await button.click();
      await page.waitForFunction(() =>
        document.fullscreenElement?.matches(
          "#youtube-test iframe.excalidraw__embeddable",
        ),
      );
      const bounds = await outer.evaluate((el) => ({
        bounds: el.getBoundingClientRect().toJSON(),
        width: innerWidth,
        height: innerHeight,
        sameDocument: el.ownerDocument === document,
      }));
      assert.ok(Math.abs(bounds.bounds.x) < 1 && Math.abs(bounds.bounds.y) < 1);
      assert.ok(
        Math.abs(bounds.bounds.width - bounds.width) < 1 &&
          Math.abs(bounds.bounds.height - bounds.height) < 1,
      );
      assert.equal(bounds.sameDocument, true);
      await button.click();
      await page.waitForFunction(() => !document.fullscreenElement);
      // A physical fullscreen display can be smaller than the emulated page.
      // Compare with the original embed after its layout commit, in CSS pixels.
      await page.waitForFunction((expected) => {
        const rect = document
          .querySelector("#youtube-test iframe.excalidraw__embeddable")
          ?.getBoundingClientRect();
        return (
          rect &&
          ["x", "y", "width", "height"].every(
            (key) => Math.abs(rect[key] - expected[key]) < 1,
          )
        );
      }, embeddedBounds);
      const restoredBox = await outer.boundingBox();
      assert.ok(
        ["x", "y", "width", "height"].every(
          (key) => Math.abs(restoredBox[key] - embeddedBounds[key]) < 1,
        ),
        JSON.stringify({ zoom, embeddedBounds, restoredBox }),
      );
      evidence.push({ zoom, fullscreenViewport: bounds.bounds, exited: true });
    }
    return {
      assertions: [
        "actual built desktop editor uses iframe for YouTube",
        "offline nested cross-origin player enters top-layer fullscreen with trusted input",
        "fullscreen ignores canvas zoom",
        "exit restores embedded geometry",
      ],
      variants: evidence,
    };
  } finally {
    await page.evaluate(async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      window.__youtubeRoot?.unmount();
      window.__youtubeDispose?.();
      document.getElementById("youtube-test")?.remove();
      delete window.__youtubeRoot;
      delete window.__youtubeAPI;
      delete window.__youtubeDispose;
    });
    await page.unroute(shim);
    await page.unroute(video);
  }
}
