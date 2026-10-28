import { mergeConfig, defineConfig } from "vitest/config";

import { productionModules } from "./tests/obsidian/sourceInventory.mjs";
// zsviczian -- additive owned test lane, coordinated by plugin PR #3022 / fork #477.
import upstream from "./vitest.config.mts";
import { inheritedRenderExportsPlugin } from "./tests/obsidian/compatibility/renderExports.mjs";
import { ownedTests } from "./tests/obsidian/compatibility/ownedTests.mjs";

export default mergeConfig(
  upstream,
  defineConfig({
    plugins: [inheritedRenderExportsPlugin()],
    test: {
      include: ["tests/obsidian/**/*.test.{ts,tsx}", ...ownedTests],
      exclude: ["**/node_modules/**", "**/tmp/**", "**/.test-work/**"],
      maxWorkers: 2,
      minWorkers: 1,
      coverage: {
        include: [
          "packages/*/src/**/*.{ts,tsx}",
          "packages/excalidraw/**/*.{ts,tsx}",
        ],
        exclude: [
          ...productionModules(import.meta.dirname).typeOnly,
          "**/*.d.ts",
          "**/*.test.*",
          "**/*.spec.*",
          "**/tests/**",
          "**/dist/**",
          "**/types/**",
          "**/locales/**",
          "**/test-utils.ts",
        ],
        reporter: ["text-summary", "json-summary", "json", "html", "lcovonly"],
        thresholds: {
          lines: 41,
          branches: 60,
          functions: 39,
          statements: 41,
          "packages/common/src/commonObsidianHost.ts": {
            lines: 100,
            branches: 100,
            functions: 100,
            statements: 100,
          },
          "packages/excalidraw/obsidianExcalidrawHost.ts": {
            lines: 100,
            branches: 100,
            functions: 100,
            statements: 100,
          },
          "packages/excalidraw/components/ObsidianRadixPortal.tsx": {
            lines: 100,
            branches: 100,
            functions: 100,
            statements: 100,
          },
          "packages/common/src/appEventBus.ts": {
            lines: 69,
            branches: 87,
            functions: 71,
            statements: 69,
          },
        },
      },
    },
  }),
);
