/**
 * zsviczian -- share locale key paths in the single production Obsidian artifact.
 * Author: zsviczian. References: dev-docs/Obsidian/runtime-compaction.md.
 * Standard ESM and development JSON retain their upstream representation. The
 * IIFE can share one path dictionary across every language without removing
 * strings or changing the default/named exports of an imported JSON module.
 */
const fs = require("node:fs");
const path = require("node:path");

const { compactTranslations } = require("./compactTranslations.cjs");

const RUNTIME_MODULE = "obsidian-packed-locale-runtime";

/** Rebuild exactly the JSON object shape, including empty objects and unusual keys. */
function expandTranslations(paths, indices, values) {
  const result = {};
  for (let i = 0; i < indices.length; i++) {
    const parts = paths[indices[i]];
    if (!parts.length) {
      return values[i];
    }
    let current = result;
    for (let j = 0; j < parts.length - 1; j++) {
      if (!Object.prototype.hasOwnProperty.call(current, parts[j])) {
        Object.defineProperty(current, parts[j], {
          value: {},
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      current = current[parts[j]];
    }
    Object.defineProperty(current, parts[parts.length - 1], {
      value: values[i],
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return result;
}

/** Collect JSON leaves in source order; arrays and empty objects stay intact. */
function translationLeaves(value, parts = [], result = []) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length
  ) {
    for (const [key, child] of Object.entries(value)) {
      translationLeaves(child, [...parts, key], result);
    }
  } else {
    result.push([parts, value]);
  }
  return result;
}

/** Build a deterministic shared dictionary and JSON-compatible language modules. */
function packTranslationModules(locales) {
  const paths = [];
  const pathIds = new Map();
  const modules = new Map();
  for (const [name, data] of [...locales.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const indices = [];
    const values = [];
    for (const [parts, value] of translationLeaves(data)) {
      const key = JSON.stringify(parts);
      if (!pathIds.has(key)) {
        pathIds.set(key, paths.length);
        paths.push(parts);
      }
      indices.push(pathIds.get(key));
      values.push(value);
    }
    // setLanguage() consumes JSON's named top-level exports, not only default.
    // Match esbuild's JSON namespace: default is the whole object and __proto__
    // stays data inside it. Other property names may include dashes or Unicode.
    const names = Object.keys(data).filter(
      (key) => !["default", "__proto__"].includes(key),
    );
    const bindings = names.map(
      (key, index) => `const value${index} = data[${JSON.stringify(key)}];`,
    );
    const exports = names.map(
      (key, index) => `value${index} as ${JSON.stringify(key)}`,
    );
    modules.set(
      name,
      [
        `import { expand } from ${JSON.stringify(RUNTIME_MODULE)};`,
        `const data = expand(${JSON.stringify(indices)}, ${JSON.stringify(
          values,
        )});`,
        ...bindings,
        `export { data as default${
          exports.length ? `, ${exports.join(", ")}` : ""
        } };`,
      ].join("\n"),
    );
  }
  const runtime = [
    `const paths = ${JSON.stringify(paths)};`,
    expandTranslations.toString(),
    "export function expand(indices, values) { return expandTranslations(paths, indices, values); }",
  ].join("\n");
  return { paths, modules, runtime };
}

/** Apply packing only to non-English component locales, with no source-file edits. */
function createPackedLocalePlugin(localeRoot) {
  return {
    name: "obsidian-packed-translations",
    setup(build) {
      let packed;
      let sourceFiles;
      build.onStart(() => {
        const fallback = JSON.parse(
          fs.readFileSync(path.join(localeRoot, "en.json"), "utf8"),
        );
        const files = fs
          .readdirSync(localeRoot)
          .filter(
            (file) =>
              file.endsWith(".json") &&
              !["en.json", "percentages.json"].includes(file),
          )
          .sort();
        const locales = new Map(
          files.map((file) => [
            file,
            compactTranslations(
              JSON.parse(fs.readFileSync(path.join(localeRoot, file), "utf8")),
              fallback,
            ),
          ]),
        );
        sourceFiles = [
          path.join(localeRoot, "en.json"),
          ...files.map((file) => path.join(localeRoot, file)),
        ];
        packed = packTranslationModules(locales);
      });
      build.onResolve({ filter: /^obsidian-packed-locale-runtime$/ }, () => ({
        path: RUNTIME_MODULE,
        namespace: "obsidian-locale",
      }));
      build.onLoad({ filter: /.*/, namespace: "obsidian-locale" }, () => ({
        contents: packed.runtime,
        loader: "js",
        watchFiles: sourceFiles,
      }));
      build.onLoad({ filter: /\.json$/ }, (args) => {
        if (path.dirname(args.path) !== localeRoot) {
          return;
        }
        const contents = packed.modules.get(path.basename(args.path));
        if (contents === undefined) {
          return;
        }
        return { contents, loader: "js", watchFiles: [args.path] };
      });
    },
  };
}

module.exports = {
  createPackedLocalePlugin,
  packTranslationModules,
  expandTranslations,
};
