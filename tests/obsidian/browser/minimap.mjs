/** zsviczian -- PR #483: actual offline artifacts, trusted navigation and portals. */
import assert from "node:assert/strict";

export async function verifyMinimap(page) {
  await page.evaluate(() => {
    const lib = window.__testLibrary;
    window.__minimapMode = "full";
    window.__minimapDispose = lib.configureObsidianCommonHost({
      protocolVersion: lib.OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
      getDeviceInfo: () => null,
      getDesktopUIMode: () => window.__minimapMode,
      getPreferredUIMode: () => window.__minimapMode,
      getCanvasLimits: () => ({ areaLimit: 16777216, widthHeightLimit: 32767 }),
      getHighlightColor: () => "#fff",
    });
  });
  const evidence = [];
  try {
    for (const mode of ["full", "compact", "tray"]) {
      await page.evaluate((mode) => {
        window.__minimapMode = mode;
        window.__testAPI.setDesktopUIMode(mode);
        window.__testAPI.updateScene({
          appState: {
            zenModeEnabled: false,
            minimapEnabled: false,
            zoom: { value: 1 },
            scrollX: 0,
            scrollY: 0,
          },
          captureUpdate: "NEVER",
        });
      }, mode);
      const toggle = page.getByTestId("button-minimap");
      await toggle.click();
      await page.waitForFunction(() => {
        const canvas = document.querySelector(".minimap__canvas");
        return (
          canvas &&
          canvas.width > 0 &&
          canvas.height > 0 &&
          canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height)
            .data.some((value) => value !== 0)
        );
      });
      const geometry = await page.locator(".minimap").evaluate((map) => {
        const editor = document.querySelector("#root").getBoundingClientRect();
        const r = map.getBoundingClientRect();
        const hit = map.ownerDocument.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2,
        );
        return {
          width: r.width,
          height: r.height,
          contained:
            r.left >= editor.left &&
            r.right <= editor.right &&
            r.top >= editor.top &&
            r.bottom <= editor.bottom,
          hit: map.contains(hit),
          tray: !!map.closest(".tray-zoom"),
        };
      });
      assert.ok(
        geometry.contained && geometry.hit,
        JSON.stringify({ mode, geometry }),
      );
      assert.equal(geometry.tray, mode === "tray");
      const center = () =>
        page.evaluate(() => {
          const s = window.__testAPI.getAppState();
          return {
            zoom: s.zoom.value,
            x: s.width / (2 * s.zoom.value) - s.scrollX,
            y: s.height / (2 * s.zoom.value) - s.scrollY,
          };
        });
      const before = await center();
      await page.locator(".minimap").hover();
      await page.mouse.wheel(0, -100);
      await page.waitForFunction(
        (zoom) => window.__testAPI.getAppState().zoom.value > zoom,
        before.zoom,
      );
      const after = await center();
      assert.ok(
        Math.abs(after.x - before.x) < 0.01 &&
          Math.abs(after.y - before.y) < 0.01,
        "Minimap wheel moved viewport center",
      );
      const scroll = await page.evaluate(() => ({
        x: window.__testAPI.getAppState().scrollX,
        y: window.__testAPI.getAppState().scrollY,
      }));
      await page.locator(".minimap").click({ position: { x: 15, y: 15 } });
      await page.waitForFunction((scroll) => {
        const s = window.__testAPI.getAppState();
        return s.scrollX !== scroll.x || s.scrollY !== scroll.y;
      }, scroll);
      await page.getByTestId("zoom-menu-trigger").click();
      const reset = page.getByTestId("zoom-menu-resetZoom");
      await reset.waitFor({ state: "visible" });
      await reset.click({ trial: true });
      assert.ok(
        await reset.evaluate(
          (button) =>
            button.ownerDocument
              .elementFromPoint(
                button.getBoundingClientRect().x + 10,
                button.getBoundingClientRect().y + 10,
              )
              ?.closest("button") === button,
        ),
        "Portaled zoom menu covered",
      );
      await reset.click();
      await page.waitForFunction(
        () => window.__testAPI.getAppState().zoom.value === 1,
      );
      await page.getByTestId("zoom-menu-trigger").click();
      await page.keyboard.press("Escape");
      await reset.waitFor({ state: "hidden" });
      await toggle.click();
      await page.locator(".minimap").waitFor({ state: "detached" });
      evidence.push({
        mode,
        ...geometry,
        painted: true,
        centeredWheel: true,
        pan: true,
        reset: true,
        escape: true,
      });
    }
  } finally {
    await page.evaluate(() => {
      window.__minimapMode = "full";
      window.__testAPI.setDesktopUIMode("full");
      window.__testAPI.updateScene({
        appState: { minimapEnabled: false },
        captureUpdate: "NEVER",
      });
      window.__minimapDispose();
      delete window.__minimapDispose;
      delete window.__minimapMode;
    });
  }
  return evidence;
}
