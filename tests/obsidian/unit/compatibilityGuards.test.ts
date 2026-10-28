// zsviczian -- dependency drift must fail closed before adapting inherited helpers.
import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

import {
  resolveInheritedRenderExport,
  resolveInheritedToolClock,
} from "../compatibility/renderExports.mjs";
it.each([
  [
    "render",
    "packages/excalidraw/tests/test-utils.ts",
    resolveInheritedRenderExport,
  ],
  [
    "tool clock",
    "packages/excalidraw/tests/helpers/ui.ts",
    resolveInheritedToolClock,
  ],
] as const)(
  "rejects unreviewed %s helper changes",
  (_label, path, transform) => {
    const source = readFileSync(path, "utf8");
    expect(() => transform(source)).not.toThrow();
    expect(() =>
      transform(`${source}\nexport const unreviewedHelperChange = true;\n`),
    ).toThrow(/review|changed/i);
  },
);
