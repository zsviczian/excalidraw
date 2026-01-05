import { getStroke, type StrokeOptions } from "perfect-freehand";

import easingsFunctions from "./easingFunctions";

import type { ExcalidrawFreeDrawElement } from "./types";

const med = (a: number[], b: number[]) => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];
const TO_FIXED_PRECISION = /(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g;

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

  return getStroke(inputPoints as number[][], options) as [number, number][];
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
