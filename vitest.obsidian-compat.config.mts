// zsviczian -- inherited tests use their original config/setup with bounded source discovery.
import { mergeConfig, defineConfig } from "vitest/config";

import upstream from "./vitest.config.mts";
import { inheritedRenderExportsPlugin } from "./tests/obsidian/compatibility/renderExports.mjs";
import { ownedTests } from "./tests/obsidian/compatibility/ownedTests.mjs";

export default mergeConfig(
  upstream,
  defineConfig({
    plugins: [inheritedRenderExportsPlugin()],
    test: {
      setupFiles: ["./tests/obsidian/compatibility/setup.ts"],
      include: [
        "packages/**/*.{test,spec}.{ts,tsx}",
        "excalidraw-app/**/*.{test,spec}.{ts,tsx}",
      ],
      exclude: [
        "**/node_modules/**",
        "**/tmp/**",
        "**/.test-work/**",
        ...ownedTests,
      ],
      maxWorkers: 2,
      minWorkers: 1,
    },
  }),
);
