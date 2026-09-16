import {
  appendFreedrawSamples,
  collectPointerSamples,
} from "../src/freedrawSamples";

import type { PointerSample } from "../src/freedrawSamples";

const sample = (clientX: number, clientY: number, pressure = 0.5) => ({
  clientX,
  clientY,
  pressure,
});

const APP_STATE = {
  zoom: { value: 1 as any },
  offsetLeft: 0,
  offsetTop: 0,
  scrollX: 0,
  scrollY: 0,
};

const element = (
  over: Partial<Parameters<typeof appendFreedrawSamples>[0]["element"]> = {},
) => ({
  x: 100,
  y: 100,
  points: [[0, 0]] as any,
  pressures: [0.4],
  simulatePressure: false,
  ...over,
});

describe("collectPointerSamples", () => {
  it("returns every sample the browser coalesced into the event", () => {
    const coalesced = [sample(1, 1, 0.1), sample(2, 2, 0.2), sample(3, 3, 0.3)];
    const event = { ...sample(3, 3, 0.3), getCoalescedEvents: () => coalesced };

    expect(collectPointerSamples(event)).toEqual(coalesced);
  });

  it("falls back to the event itself", () => {
    // No support for coalescing at all.
    expect(collectPointerSamples(sample(4, 5, 0.6))).toEqual([
      sample(4, 5, 0.6),
    ]);
    // Supported, but nothing reported.
    expect(
      collectPointerSamples({
        ...sample(4, 5, 0.6),
        getCoalescedEvents: () => [],
      }),
    ).toEqual([sample(4, 5, 0.6)]);
  });

  it("keeps only position and pressure", () => {
    const event = {
      ...sample(1, 2, 0.3),
      pointerId: 7,
      getCoalescedEvents: undefined,
    };

    expect(Object.keys(collectPointerSamples(event)[0]).sort()).toEqual([
      "clientX",
      "clientY",
      "pressure",
    ]);
  });
});

describe("appendFreedrawSamples", () => {
  it("appends one point per sample, relative to the element", () => {
    const result = appendFreedrawSamples({
      element: element(),
      samples: [sample(104, 100, 0.5), sample(108, 103, 0.6)],
      appState: APP_STATE,
    });

    expect(result).not.toBeNull();
    expect(result!.points).toEqual([
      [0, 0],
      [4, 0],
      [8, 3],
    ]);
    expect(result!.pressures).toEqual([0.4, 0.5, 0.6]);
  });

  it("converts through zoom, scroll and canvas offset", () => {
    const result = appendFreedrawSamples({
      element: element({ x: 0, y: 0 }),
      samples: [sample(120, 140)],
      appState: {
        zoom: { value: 2 as any },
        offsetLeft: 20,
        offsetTop: 40,
        scrollX: 5,
        scrollY: 10,
      },
    });

    // (120 - 20) / 2 - 5 = 45, (140 - 40) / 2 - 10 = 40
    expect(result!.points[1]).toEqual([45, 40]);
  });

  it("skips a sample that repeats the previous point", () => {
    const result = appendFreedrawSamples({
      element: element(),
      samples: [sample(100, 100), sample(104, 100), sample(104, 100)],
      appState: APP_STATE,
    });

    // The first sample repeats the element's own origin point.
    expect(result!.points).toEqual([
      [0, 0],
      [4, 0],
    ]);
    expect(result!.pressures).toEqual([0.4, 0.5]);
  });

  it("returns null when no sample adds a point", () => {
    expect(
      appendFreedrawSamples({
        element: element(),
        samples: [sample(100, 100), sample(100, 100)],
        appState: APP_STATE,
      }),
    ).toBeNull();

    expect(
      appendFreedrawSamples({
        element: element(),
        samples: [] as PointerSample[],
        appState: APP_STATE,
      }),
    ).toBeNull();
  });

  it("pins pressure to 1 for a constant-pressure pen", () => {
    const result = appendFreedrawSamples({
      element: element(),
      samples: [sample(104, 100, 0.2), sample(108, 100, 0.9)],
      appState: APP_STATE,
      constantPressure: true,
    });

    expect(result!.pressures).toEqual([0.4, 1, 1]);
  });

  it("records no pressures while pressure is simulated", () => {
    const result = appendFreedrawSamples({
      element: element({ simulatePressure: true, pressures: [] }),
      samples: [sample(104, 100), sample(108, 100)],
      appState: APP_STATE,
    });

    expect(result!.points).toHaveLength(3);
    expect(result!.pressures).toEqual([]);
  });
});
