// zsviczian -- independent Obsidian validation tooling; never shipped.
/** Runtime denominator discovery; this is classification, never execution credit. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
export function isTypeOnlySource(source, fileName) {
  if (fileName.endsWith(".d.ts")) {
    return true;
  }
  const output = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      removeComments: true,
    },
  }).outputText;
  return !output
    .replace(/export\s*\{\s*\};?/g, "")
    .replaceAll(";", "")
    .trim();
}
export function productionModules(root) {
  const runtime = [];
  const typeOnly = [];
  const visit = (directory) => {
    for (const entry of readdirSync(join(root, directory), {
      withFileTypes: true,
    })) {
      if (entry.isSymbolicLink()) {
        throw Error(`Redirected production source: ${entry.name}`);
      }
      const path = `${directory}/${entry.name}`;
      if (
        /\/(?:tests|__tests__|dist|types|locales|node_modules)$/.test(path) ||
        /\.(?:test|spec)\.tsx?$/.test(path) ||
        path.endsWith("/test-utils.ts")
      ) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(path);
      } else if (/\.tsx?$/.test(path)) {
        (isTypeOnlySource(readFileSync(join(root, path), "utf8"), path)
          ? typeOnly
          : runtime
        ).push(path);
      }
    }
  };
  for (const entry of readdirSync(join(root, "packages"))) {
    if (entry === "excalidraw") {
      visit("packages/excalidraw");
    } else if (existsSync(join(root, "packages", entry, "src"))) {
      visit(`packages/${entry}/src`);
    }
  }
  return { runtime: runtime.sort(), typeOnly: typeOnly.sort() };
}
