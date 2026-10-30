// zsviczian -- preserve reviewed upstream parameterized occurrences; reject new collisions.
import assert from "node:assert/strict";
/**
 * @template {{testId: string}} T
 * @param {T[]} tests
 * @param {{testId: string, count: number}[]} catalogue
 * @returns {(T & {baseTestId?: string, occurrence?: number})[]}
 */
export function normalizeTestIdentities(tests, catalogue) {
  const counts = new Map();
  for (const test of tests) {
    counts.set(test.testId, (counts.get(test.testId) || 0) + 1);
  }
  const collisions = [...counts]
    .filter(([, count]) => count > 1)
    .map(([testId, count]) => ({ testId, count }));
  assert.deepEqual(
    [...collisions].sort((a, b) =>
      a.testId < b.testId ? -1 : a.testId > b.testId ? 1 : 0,
    ),
    [...catalogue].sort((a, b) =>
      a.testId < b.testId ? -1 : a.testId > b.testId ? 1 : 0,
    ),
    "Unreviewed duplicate test titles; inspect actual parameterized declarations",
  );
  const occurrences = new Map();
  return tests.map((test) => {
    if (counts.get(test.testId) === 1) {
      return test;
    }
    const occurrence = (occurrences.get(test.testId) || 0) + 1;
    occurrences.set(test.testId, occurrence);
    return {
      ...test,
      baseTestId: test.testId,
      occurrence,
      testId: `${test.testId}::occurrence-${occurrence}`,
    };
  });
}
