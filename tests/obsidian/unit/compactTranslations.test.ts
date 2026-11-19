/**
 * zsviczian -- PR #491: preserve every effective translation while compacting.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/491
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { expect, it } from "vitest";

import { compactTranslations } from "../../../scripts/compactTranslations.cjs";

it("omits only empty or identical fallback strings without mutating source data", () => {
  const source = {
    labels: {
      translated: "矩形",
      unchanged: "Rectangle",
      missing: "",
      custom: "Local",
    },
    unknown: null,
    values: ["", "Rectangle"],
  };
  const fallback = {
    labels: {
      translated: "Rectangle",
      unchanged: "Rectangle",
      missing: "Fallback",
    },
  };
  const before = JSON.stringify(source);
  expect(compactTranslations(source, fallback)).toEqual({
    labels: { translated: "矩形", custom: "Local" },
    unknown: null,
    values: ["", "Rectangle"],
  });
  expect(JSON.stringify(source)).toBe(before);
  expect(compactTranslations({ labels: { missing: "" } }, fallback)).toEqual({
    labels: {},
  });
});

const root = resolve(
  import.meta.dirname,
  "../../../packages/excalidraw/locales",
);
const fallback = JSON.parse(readFileSync(resolve(root, "en.json"), "utf8"));
function paths(data: unknown, prefix = ""): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return [prefix];
  }
  return Object.entries(data).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
}
function get(data: unknown, path: string): unknown {
  let current = data;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

for (const name of readdirSync(root).filter(
  (name) =>
    name.endsWith(".json") && !["en.json", "percentages.json"].includes(name),
)) {
  it(`preserves every translated/fallback path in ${name}`, () => {
    const original = JSON.parse(readFileSync(resolve(root, name), "utf8"));
    const compact = compactTranslations(original, fallback);
    // The public i18n contract uses a truthy translation, then English, then
    // the caller's explicit fallback. Check the union, including legacy keys.
    for (const path of new Set([...paths(original), ...paths(fallback)])) {
      const english = get(fallback, path);
      expect(
        get(compact, path) || english || "explicit fallback",
        path,
      ).toEqual(get(original, path) || english || "explicit fallback");
    }
    expect(JSON.stringify(compact).length).toBeLessThanOrEqual(
      JSON.stringify(original).length,
    );
  });
}
