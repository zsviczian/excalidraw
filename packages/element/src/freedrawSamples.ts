import { viewportCoordsToSceneCoords } from "@excalidraw/common";
import { pointFrom } from "@excalidraw/math";

import type { LocalPoint } from "@excalidraw/math";

import type { ExcalidrawFreeDrawElement } from "./types";

/** One pointer position and pressure, in viewport coordinates. */
export type PointerSample = {
  clientX: number;
  clientY: number;
  pressure: number;
};

type CoalescingPointerEvent = PointerSample & {
  getCoalescedEvents?: () => readonly PointerSample[];
};

/**
 * The samples an event carries: the ones the browser coalesced into it, or the
 * event itself where coalescing is unsupported or reported nothing.
 *
 * A pen reports positions far faster than a page renders (commonly ~250Hz
 * against a 60-120Hz display), and the browser merges the extra samples into
 * the next dispatched pointermove instead of dispatching each one.
 */
export const collectPointerSamples = (
  event: CoalescingPointerEvent,
): PointerSample[] => {
  const coalesced = event.getCoalescedEvents?.() ?? [];

  return (coalesced.length ? coalesced : [event]).map(
    ({ clientX, clientY, pressure }) => ({ clientX, clientY, pressure }),
  );
};

type ViewportTransform = Parameters<typeof viewportCoordsToSceneCoords>[1];

/**
 * Appends pointer samples to a freedraw element's points, in element-local
 * coordinates. Returns null when every sample repeats the last point, so
 * callers can skip a mutation that would change nothing.
 *
 * A sample identical to the previous point is skipped, matching what the
 * pointermove path has always done: a stroke should not carry geometry the
 * editor would never emit itself.
 */
export const appendFreedrawSamples = ({
  element,
  samples,
  appState,
  constantPressure = false,
}: {
  element: Pick<
    ExcalidrawFreeDrawElement,
    "x" | "y" | "points" | "pressures" | "simulatePressure"
  >;
  samples: readonly PointerSample[];
  appState: ViewportTransform;
  /** Pins every appended pressure to 1, for pens configured that way. */
  constantPressure?: boolean;
}): { points: LocalPoint[]; pressures: number[] } | null => {
  const points: LocalPoint[] = [...element.points];
  // Stays empty while pressure is simulated: the element then derives its
  // width from velocity and keeps no pressures.
  const pressures = [...element.pressures];
  let pointAdded = false;

  for (const sample of samples) {
    const sceneCoords = viewportCoordsToSceneCoords(sample, appState);
    const dx = sceneCoords.x - element.x;
    const dy = sceneCoords.y - element.y;

    const lastPoint = points.length > 0 ? points[points.length - 1] : null;
    if (lastPoint && lastPoint[0] === dx && lastPoint[1] === dy) {
      continue;
    }

    points.push(pointFrom<LocalPoint>(dx, dy));
    if (!element.simulatePressure) {
      pressures.push(constantPressure ? 1 : sample.pressure);
    }
    pointAdded = true;
  }

  return pointAdded ? { points, pressures } : null;
};
