import { getStroke } from "perfect-freehand";

import { getStrokeWithRelativeEndNoise } from "../src/freedrawPath";

import type { StrokeOptions } from "perfect-freehand";

const BASE_OPTIONS: StrokeOptions = {
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: false,
  last: true,
};

const extent = (outline: number[][]) => {
  const xs = outline.map(([x]) => x);
  const ys = outline.map(([, y]) => y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

/**
 * The furthest any drawn point sits from the nearest point of the outline:
 * how far the rendered stroke strays from what was drawn.
 */
const strayDistance = (points: number[][], outline: number[][]) =>
  Math.max(
    ...points.map(([px, py]) =>
      Math.min(
        ...outline.map(([ox, oy]) => Math.hypot(ox - px, oy - py)),
      ),
    ),
  );

/** A short horizontal stroke, as written when handwriting small. */
const shortStroke = (length: number) =>
  Array.from({ length: 11 }, (_, i) => [(i * length) / 10, 0, 0.5]);

describe("getStrokeWithRelativeEndNoise", () => {
  it("leaves strokes at or above perfect-freehand's nominal size untouched", () => {
    for (const size of [16, 24, 100]) {
      const points = shortStroke(20);
      const options = { ...BASE_OPTIONS, size };
      expect(getStrokeWithRelativeEndNoise(points, options)).toEqual(
        getStroke(points, options),
      );
    }
  });

  it("follows the drawn path to the end of a stroke thinner than the nominal size", () => {
    // A small arc, as in handwriting: size 2 is a 0.5 strokeWidth pen, and
    // perfect-freehand's absolute 3-unit cutoff covers most of this stroke.
    // The cutoff keeps the final point but drops everything leading to it, so
    // the outline leaves the drawn path and cuts straight across.
    const radius = 2;
    const points = Array.from({ length: 13 }, (_, i) => {
      const angle = (Math.PI * i) / 12;
      return [radius * Math.cos(angle), radius * Math.sin(angle), 0.5];
    });
    const options = { ...BASE_OPTIONS, size: 2 };

    const patchedOutline = getStrokeWithRelativeEndNoise(points, options);
    const originalOutline = getStroke(points, options);

    // Every drawn point keeps outline within about half a stroke width.
    // Measured: 1.07 patched vs 1.61 original.
    expect(strayDistance(points, patchedOutline)).toBeLessThan(1.2);
    expect(strayDistance(points, originalOutline)).toBeGreaterThan(1.5);

    // The arc also loses height as its end is cut back: 3.87 vs 3.24, so the
    // drawn curve renders ~16% shorter than the pen travelled.
    expect(extent(patchedOutline).height).toBeGreaterThan(
      extent(originalOutline).height * 1.15,
    );
  });

  it("scales the cutoff with size rather than removing it", () => {
    // A stroke far longer than the cutoff is unaffected either way, so the two
    // agree on everything except the last few units.
    const points = shortStroke(400);
    const options = { ...BASE_OPTIONS, size: 2 };

    const patched = extent(getStrokeWithRelativeEndNoise(points, options));
    const original = extent(getStroke(points, options));

    expect(Math.abs(patched.width - original.width)).toBeLessThan(3);
    expect(patched.height).toBeCloseTo(original.height, 1);
  });

  it("still draws a dot for a single point", () => {
    const options = { ...BASE_OPTIONS, size: 2 };
    const dot = extent(getStrokeWithRelativeEndNoise([[0, 0, 0.5]], options));

    // Drawn as a 13-step polygon, so width and height are close but not equal.
    expect(dot.width).toBeGreaterThan(options.size / 2);
    expect(dot.width).toBeLessThan(options.size * 1.5);
    expect(dot.width / dot.height).toBeCloseTo(1, 1);
  });

  it("scales numeric taper lengths with the points", () => {
    const points = shortStroke(40);
    const options: StrokeOptions = { ...BASE_OPTIONS, size: 2 };

    // A taper of 20 units covers half of this stroke; the same call at nominal
    // size is the reference the helper must reproduce.
    const tapered = getStrokeWithRelativeEndNoise(points, {
      ...options,
      start: { taper: 20 },
    });
    const scale = 16 / 2;
    const reference = getStroke(
      points.map(([x, y, p]) => [x * scale, y * scale, p]),
      { ...options, size: 16, start: { taper: 20 * scale } },
    ).map(([x, y]) => [x / scale, y / scale]);

    expect(tapered).toEqual(reference);
    // Tapering narrows the start, so it is not the same as no taper.
    expect(tapered).not.toEqual(getStrokeWithRelativeEndNoise(points, options));
  });
});
