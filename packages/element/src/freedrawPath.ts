import { getStroke, type StrokeOptions } from "perfect-freehand";

import easingsFunctions from "./easingFunctions";

import type { ExcalidrawFreeDrawElement } from "./types";

const med = (a: number[], b: number[]) => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];
const TO_FIXED_PRECISION = /(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g;

// perfect-freehand's default stroke size, which its absolute constants assume.
const PERFECT_FREEHAND_NOMINAL_SIZE = 16;

/**
 * getStroke with perfect-freehand's end-noise cutoff made relative to size.
 *
 * perfect-freehand skips every input point within 3 units of a stroke's end
 * (`totalLength - runningLength < 3`), an absolute distance chosen for its
 * nominal 16-unit size. Freedraw strokes are frequently far thinner (a
 * strokeWidth of 0.5 gives size ~2), for example handwriting on an imported
 * PDF page, where 3 units is most of a dot, a cross-stroke or a short join, so
 * those collapse into caps and blobs. Scaling the input up to the nominal size
 * and the outline back down makes the cutoff 3 * size / 16 instead. Every
 * other length perfect-freehand uses is relative to size or only sets a
 * direction, and numeric taper lengths are scaled with the points, so the
 * outline is otherwise unchanged.
 */
export const getStrokeWithRelativeEndNoise = (
  points: number[][],
  options: StrokeOptions,
): number[][] => {
  const size = options.size ?? PERFECT_FREEHAND_NOMINAL_SIZE;
  if (!(size > 0) || size >= PERFECT_FREEHAND_NOMINAL_SIZE) {
    return getStroke(points, options);
  }
  const scale = PERFECT_FREEHAND_NOMINAL_SIZE / size;
  const scaleTaper = (cap: StrokeOptions["start"]) =>
    cap && typeof cap.taper === "number"
      ? { ...cap, taper: cap.taper * scale }
      : cap;
  const outline = getStroke(
    points.map(([x, y, ...rest]) => [x * scale, y * scale, ...rest]),
    {
      ...options,
      size: size * scale,
      start: scaleTaper(options.start),
      end: scaleTaper(options.end),
    },
  );
  return outline.map(([x, y]) => [x / scale, y / scale]);
};

export const getFreedrawOutlinePoints = (
  element: ExcalidrawFreeDrawElement,
): [number, number][] => {
  const inputPoints = element.simulatePressure
    ? element.points
    : element.points.length
    ? element.points.map(([x, y], i) => [x, y, element.pressures[i]])
    : [[0, 0, 0.5]];

  const customOptions = element.customData?.strokeOptions?.options;
  const options: StrokeOptions = customOptions
    ? {
        ...customOptions,
        simulatePressure:
          customOptions.simulatePressure ?? element.simulatePressure,
        size: element.strokeWidth * 4.25,
        last: true,
        easing: easingsFunctions[customOptions.easing] ?? ((t) => t),
        ...(customOptions.start?.easing
          ? {
              start: {
                ...customOptions.start,
                easing:
                  easingsFunctions[customOptions.start.easing] ?? ((t) => t),
              },
            }
          : { start: customOptions.start }),
        ...(customOptions.end?.easing
          ? {
              end: {
                ...customOptions.end,
                easing:
                  easingsFunctions[customOptions.end.easing] ?? ((t) => t),
              },
            }
          : { end: customOptions.end }),
      }
    : {
        simulatePressure: element.simulatePressure,
        size: element.strokeWidth * 4.25,
        thinning: 0.6,
        smoothing: 0.5,
        streamline: 0.5,
        easing: easingsFunctions.easeOutSine,
        last: true,
      };

  return getStrokeWithRelativeEndNoise(
    inputPoints as number[][],
    options,
  ) as [number, number][];
};

export const getSvgPathFromStroke = (points: number[][]): string => {
  if (!points.length) {
    return "";
  }
  const max = points.length - 1;
  return points
    .reduce(
      (acc, point, i, arr) => {
        if (i === max) {
          acc.push(point, med(point, arr[0]), "L", arr[0], "Z");
        } else {
          acc.push(point, med(point, arr[i + 1]));
        }
        return acc;
      },
      ["M", points[0], "Q"],
    )
    .join(" ")
    .replace(TO_FIXED_PRECISION, "$1");
};

export const getFreeDrawSvgPath = (
  element: ExcalidrawFreeDrawElement,
): string => getSvgPathFromStroke(getFreedrawOutlinePoints(element));
