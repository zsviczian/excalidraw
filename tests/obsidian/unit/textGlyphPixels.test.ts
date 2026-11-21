/**
 * zsviczian -- exact CI fringe regression and displacement negative controls.
 * Author: zsviczian. PR #493 / plugin #3064; CI run 44889615453.
 */
import { expect, it } from "vitest";

import { compareTextGlyphPixels } from "../browser/textGlyphPixels.mjs";
import fixture from "../fixtures/text-glyph-ci.json";

const decode = (runs: number[][]) =>
  new Uint8ClampedArray(
    runs.flatMap(([value, count]) =>
      Array.from({ length: count }, () => [value, value, value, 255]).flat(),
    ),
  );

const before = decode(fixture.before);
const after = decode(fixture.after);

it("accepts the exact CI fringe change with identical glyph cores", () => {
  expect(before.length).toBe(fixture.width * fixture.height * 4);
  const result = compareTextGlyphPixels(before, after);
  expect(
    result.masks.map(({ threshold, changed }) => ({ threshold, changed })),
  ).toEqual([
    { threshold: 64, changed: 0 },
    { threshold: 128, changed: 0 },
    { threshold: 200, changed: 1 },
  ]);
  expect(result.stable).toBe(true);
});

it.each([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
])("rejects real glyph movement by %i/%i pixels", (dx, dy) => {
  const moved = new Uint8ClampedArray(before.length).fill(255);
  for (let y = 0; y < fixture.height; y++) {
    for (let x = 0; x < fixture.width; x++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= 0 && tx < fixture.width && ty >= 0 && ty < fixture.height) {
        const source = (y * fixture.width + x) * 4;
        moved.set(
          before.subarray(source, source + 4),
          (ty * fixture.width + tx) * 4,
        );
      }
    }
  }
  const result = compareTextGlyphPixels(before, moved);
  expect(result.stable).toBe(false);
  expect(
    result.masks
      .filter((mask) => mask.threshold <= 128)
      .every((mask) => mask.changed > 0),
  ).toBe(true);
});

it("rejects removal of even one glyph-core pixel", () => {
  const changed = new Uint8ClampedArray(before);
  const index = Array.from(before).findIndex(
    (value, i) => i % 4 === 0 && value < 64,
  );
  expect(index).toBeGreaterThanOrEqual(0);
  changed.set([255, 255, 255, 255], index);
  expect(compareTextGlyphPixels(before, changed).stable).toBe(false);
});

it("rejects blank and mismatched images instead of accepting missing text", () => {
  const blank = new Uint8ClampedArray(before.length).fill(255);
  expect(compareTextGlyphPixels(blank, blank).stable).toBe(false);
  expect(() => compareTextGlyphPixels(before, after.subarray(4))).toThrow();
  expect(() => compareTextGlyphPixels([], [])).toThrow();
});
