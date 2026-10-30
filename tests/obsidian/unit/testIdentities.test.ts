// zsviczian -- title ambiguity cannot discard failures or accept new parameter cases.
import { expect, it } from "vitest";

import { normalizeTestIdentities } from "../testIdentities.mjs";
it("retains each reviewed occurrence and its original status", () => {
  const tests = [
    { testId: "known", status: "passed" },
    { testId: "known", status: "failed" },
  ];
  const normalized = normalizeTestIdentities(tests, [
    { testId: "known", count: 2 },
  ]);
  expect(normalized.map((test) => test.testId)).toEqual([
    "known::occurrence-1",
    "known::occurrence-2",
  ]);
  expect(normalized.map((test) => test.status)).toEqual(["passed", "failed"]);
  expect(
    normalizeTestIdentities(
      [{ testId: "b" }, { testId: "a" }, { testId: "b" }, { testId: "a" }],
      [
        { testId: "a", count: 2 },
        { testId: "b", count: 2 },
      ],
    ),
  ).toHaveLength(4);
});
it("rejects unknown collisions, changed occurrence counts and obsolete exemptions", () => {
  expect(() =>
    normalizeTestIdentities([{ testId: "new" }, { testId: "new" }], []),
  ).toThrow(/Unreviewed/);
  expect(() =>
    normalizeTestIdentities(
      [{ testId: "known" }, { testId: "known" }, { testId: "known" }],
      [{ testId: "known", count: 2 }],
    ),
  ).toThrow(/Unreviewed/);
  expect(() =>
    normalizeTestIdentities(
      [{ testId: "known" }],
      [{ testId: "known", count: 2 }],
    ),
  ).toThrow(/Unreviewed/);
});
