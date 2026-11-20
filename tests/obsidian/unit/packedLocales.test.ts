/** zsviczian -- preserve real locale module contracts while sharing key paths. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { expect, it } from "vitest";

import {
  expandTranslations,
  packTranslationModules,
} from "../../../scripts/packedLocalePlugin.cjs";

it("preserves every real JSON default/named export, including unusual keys", () => {
  // esbuild must run in Node's native realm, not JSDOM's Uint8Array realm.
  const output = execFileSync(
    process.execPath,
    [resolve(import.meta.dirname, "../localeModules.mjs")],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
    },
  );
  expect(JSON.parse(output)).toEqual({
    languages: 56,
    englishAndPercentagesUnchanged: true,
    unusualKeysPreserved: true,
  });
});

it("shares paths deterministically and keeps input values and empty objects", () => {
  const first = {
    labels: { title: "One", empty: {}, values: [null, "", false, 2] },
  };
  const second = { labels: { title: "Two", empty: {}, values: [1, 2] } };
  const before = JSON.stringify([first, second]);
  const a = packTranslationModules(
    new Map([
      ["a", first],
      ["b", second],
    ]),
  );
  const b = packTranslationModules(
    new Map([
      ["b", second],
      ["a", first],
    ]),
  );
  expect(a.paths).toEqual([
    ["labels", "title"],
    ["labels", "empty"],
    ["labels", "values"],
  ]);
  expect(a.runtime).toBe(b.runtime);
  expect([...a.modules]).toEqual([...b.modules]);
  expect(
    expandTranslations(a.paths, [0, 1, 2], ["One", {}, [null, "", false, 2]]),
  ).toEqual(first);
  expect(JSON.stringify([first, second])).toBe(before);
});
