// zsviczian -- source-level breakpoint oracles; actual geometry/input is native evidence.
import { afterEach, expect, it } from "vitest";
import {
  configureObsidianCommonHost,
  OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
  type ObsidianDeviceType,
} from "@excalidraw/common/commonObsidianHost";
import {
  getFormFactor,
  deriveStylesPanelMode,
} from "@excalidraw/common/editorInterface";
let dispose: (() => void) | undefined;
afterEach(() => dispose?.());
function host({
  desktop = false,
  tablet = false,
  phoneMode = "mobile",
}: {
  desktop?: boolean;
  tablet?: boolean;
  phoneMode?: "mobile" | "compact";
} = {}) {
  const device: ObsidianDeviceType = {
    isDesktop: desktop,
    isPhone: !desktop && !tablet,
    isTablet: tablet,
    isMobile: !desktop,
    isLinux: false,
    isMacOS: false,
    isWindows: desktop,
    isIOS: false,
    isAndroid: !desktop,
  };
  dispose = configureObsidianCommonHost({
    protocolVersion: OBSIDIAN_COMMON_HOST_PROTOCOL_VERSION,
    getDeviceInfo: () => device,
    getDesktopUIMode: () => "full",
    getPreferredUIMode: (form) =>
      form === "phone" ? phoneMode : form === "tablet" ? "compact" : "full",
    getCanvasLimits: () => ({ areaLimit: 16777216, widthHeightLimit: 32767 }),
    getHighlightColor: () => "#fff",
  });
}
it.each([
  [598, 900, "phone"],
  [599, 900, "phone"],
  [600, 900, "tablet"],
  [999, 499, "phone"],
  [1000, 499, "desktop"],
  [1001, 499, "desktop"],
  [999, 500, "desktop"],
  [999, 501, "desktop"],
] as const)(
  "classifies mobile editor %s x %s as %s",
  (width, height, expected) => {
    host();
    expect(getFormFactor(width, height, true)).toBe(expected);
  },
);
it("narrow desktop remains desktop and a tablet host remains tablet beyond width thresholds", () => {
  host({ desktop: true });
  expect(getFormFactor(390, 844, true)).toBe("desktop");
  host({ tablet: true });
  expect(getFormFactor(1400, 900, true)).toBe("tablet");
});
it("phone preference and allowMobile are live semantic capabilities", () => {
  host();
  expect(getFormFactor(390, 844, true)).toBe("phone");
  expect(getFormFactor(390, 844, false)).toBe("desktop");
  host({ phoneMode: "compact" });
  expect(getFormFactor(390, 844, true)).toBe("tablet");
  expect(
    deriveStylesPanelMode({
      formFactor: "tablet",
      desktopUIMode: "full",
      canFitSidebar: false,
      isLandscape: false,
      isTouchScreen: true,
      userAgent: { isMobileDevice: true, platform: "android" },
    }),
  ).toBe("compact");
});
