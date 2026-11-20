/** zsviczian -- compare real JSON and packed module exports in Node's native realm. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { build } from "esbuild";

const require = createRequire(import.meta.url);
const {
  compactTranslations,
} = require("../../scripts/compactTranslations.cjs");
const {
  createPackedLocalePlugin,
  packTranslationModules,
} = require("../../scripts/packedLocalePlugin.cjs");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const locales = join(root, "packages/excalidraw/locales");
const fallback = JSON.parse(readFileSync(join(locales, "en.json"), "utf8"));
const files = readdirSync(locales)
  .filter((name) => name.endsWith(".json"))
  .sort();
const baseline = {
  name: "baseline-json",
  setup(b) {
    b.onLoad({ filter: /\.json$/ }, (args) => {
      if (
        dirname(args.path) !== locales ||
        ["en.json", "percentages.json"].includes(
          args.path.split(/[\\/]/).at(-1),
        )
      ) {
        return;
      }
      return {
        contents: JSON.stringify(
          compactTranslations(
            JSON.parse(readFileSync(args.path, "utf8")),
            fallback,
          ),
        ),
        loader: "json",
      };
    });
  },
};
async function load(contents, plugins) {
  const result = await build({
    stdin: { contents, resolveDir: root },
    bundle: true,
    write: false,
    format: "cjs",
    platform: "browser",
    target: "es2020",
    supported: { "arbitrary-module-namespace-names": true },
    plugins,
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, {
    module,
    exports: module.exports,
  });
  return module.exports;
}
const entry = files
  .map(
    (file, index) =>
      `import * as language${index} from "./packages/excalidraw/locales/${file}";export{language${index}};`,
  )
  .join("\n");
const original = await load(entry, [baseline]);
const packed = await load(entry, [createPackedLocalePlugin(locales)]);
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
for (const [index, file] of files.entries()) {
  const a = original[`language${index}`];
  const b = packed[`language${index}`];
  assert.deepEqual(
    Object.keys(b).sort(),
    Object.keys(a).sort(),
    `${file} namespace`,
  );
  for (const name of Object.keys(a)) {
    assert.equal(hash(b[name]), hash(a[name]), `${file} export ${name}`);
  }
}

const unusual = JSON.parse(
  '{"labels":{"empty":{},"array":["",null,2],"dot.key":"value"},"dash-key":3,"汉字":4,"default":5,"__proto__":{"safe":true},"constructor":{"prototype":{"safe":true}}}',
);
const fixtureEntry = 'import * as value from "fixture";export default value;';
const rawFixture = {
  name: "json-fixture",
  setup(b) {
    b.onResolve({ filter: /^fixture$/ }, () => ({
      path: "fixture",
      namespace: "fixture",
    }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
      contents: JSON.stringify(unusual),
      loader: "json",
    }));
  },
};
const data = packTranslationModules(new Map([["fixture", unusual]]));
const packedFixture = {
  name: "packed-fixture",
  setup(b) {
    b.onResolve(
      { filter: /^(fixture|obsidian-packed-locale-runtime)$/ },
      (args) => ({ path: args.path, namespace: "fixture" }),
    );
    b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
      contents:
        args.path === "fixture" ? data.modules.get("fixture") : data.runtime,
      loader: "js",
    }));
  },
};
const a = (await load(fixtureEntry, [rawFixture])).default;
const b = (await load(fixtureEntry, [packedFixture])).default;
assert.deepEqual(
  Object.keys(b).sort(),
  Object.keys(a).sort(),
  "unusual JSON namespace",
);
for (const name of Object.keys(a)) {
  assert.equal(hash(b[name]), hash(a[name]), `unusual export ${name}`);
}
assert.equal(Object.hasOwn(b.default, "__proto__"), true);
assert.equal({}.safe, undefined);
process.stdout.write(
  `${JSON.stringify({
    languages: files.length - 2,
    englishAndPercentagesUnchanged: true,
    unusualKeysPreserved: true,
  })}\n`,
);
