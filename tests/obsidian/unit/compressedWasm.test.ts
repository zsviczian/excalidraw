/**
 * zsviczian -- font packaging keeps the executable binaries byte-identical.
 * Author: zsviczian. See dev-docs/Obsidian/runtime-compaction.md.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import * as pako from "pako";
import ts from "typescript";
import { expect, it } from "vitest";

import { compressWasmModule } from "../../../scripts/compressObsidianWasm.cjs";

function loadModule(source: string): Uint8Array<ArrayBuffer> {
  const module = { exports: {} as { default?: Uint8Array } };
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  runInNewContext(outputText, {
    module,
    exports: module.exports,
    Uint8Array,
    atob,
    require: (name: string) => {
      expect(name).toBe("pako");
      return pako;
    },
  });
  // Own the VM result's buffer before handing it to the host WebAssembly API.
  return Uint8Array.from(module.exports.default!);
}

for (const file of ["woff2/woff2-wasm.ts", "harfbuzz/harfbuzz-wasm.ts"]) {
  it(`keeps ${file} executable and byte-identical with the existing decoder`, () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../packages/excalidraw/subset", file),
      "utf8",
    );
    const packed = compressWasmModule(source, file);
    const original = loadModule(source);
    const restored = loadModule(packed);
    expect(Buffer.from(restored)).toEqual(Buffer.from(original));
    expect(WebAssembly.validate(restored)).toBe(true);
    expect(
      WebAssembly.Module.exports(new WebAssembly.Module(restored)),
    ).toEqual(WebAssembly.Module.exports(new WebAssembly.Module(original)));
    expect(Buffer.byteLength(packed)).toBeLessThan(Buffer.byteLength(source));
  });
}

it("fails the build when a generated module changes format or binary content", () => {
  expect(() =>
    compressWasmModule("export default new Uint8Array();", "changed.ts"),
  ).toThrow();
  expect(() =>
    compressWasmModule("export default __toBinary(`invalid`);", "broken.ts"),
  ).toThrow();
});
