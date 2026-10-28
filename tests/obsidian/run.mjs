// zsviczian -- independent owned/inherited reports with explicit source identities.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { normalizeTestIdentities } from "./testIdentities.mjs";
import { sourceIdentity } from "./provenance.mjs";
import { productionModules } from "./sourceInventory.mjs";
import { writeReportFiles } from "./reportFiles.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const compatibility = process.argv.includes("--compatibility");
const coverage = process.argv.includes("--coverage");
assert.ok(
  !process.argv
    .slice(2)
    .some((arg) => !["--compatibility", "--coverage"].includes(arg)),
  "Unknown fork test option",
);
const suiteId = compatibility ? "fork-inherited" : "fork-owned";
const output = resolve(
  process.env.EXCALIDRAW_TEST_REPORT_DIR ||
    join(root, ".test-work/reports", suiteId + (coverage ? "-source" : "")),
);
mkdirSync(output, { recursive: true });
const before = sourceIdentity(root);
const args = [
  join(root, "node_modules/vitest/vitest.mjs"),
  "run",
  "--config",
  compatibility
    ? "vitest.obsidian-compat.config.mts"
    : "vitest.obsidian.config.mts",
  "--reporter=default",
  "--reporter=json",
  `--outputFile=${join(output, "vitest.json")}`,
  ...(coverage
    ? ["--coverage", `--coverage.reportsDirectory=${join(output, "source")}`]
    : []),
];
const result = spawnSync(process.execPath, args, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
  timeout: 600000,
});
const report = {
  schemaVersion: 2,
  suiteId,
  status: "failed",
  cleanup: "passed",
  source: before,
  toolchain: { node: process.version, platform: process.platform },
  tests: [],
};
try {
  if (result.error) {
    throw result.error;
  }
  const raw = JSON.parse(readFileSync(join(output, "vitest.json"), "utf8"));
  const ledger = JSON.parse(
    readFileSync(join(root, "dev-docs/Obsidian/file-inventory.json"), "utf8"),
  );
  for (const file of raw.testResults) {
    const path = relative(root, file.name).replaceAll("\\", "/");
    const ids = ledger.files.find((entry) => entry.path === path)?.ids || [];
    for (const item of file.assertionResults) {
      const pending = ["pending", "todo", "skipped"].includes(item.status);
      report.tests.push({
        testId: `${suiteId}:${path}::${item.fullName}`,
        sourcePath: path,
        title: item.fullName,
        featureIds: [],
        customizationIds: ids,
        status:
          item.status === "passed" ? "passed" : pending ? "blocked" : "failed",
        ...(item.status === "passed"
          ? {}
          : {
              reason: pending
                ? `Explicit upstream ${item.status}`
                : (item.failureMessages || []).join("\n") ||
                  "Suite assertion failed",
            }),
        durationMs: item.duration || 0,
      });
    }
  }
  report.rawStatus = {
    exitCode: result.status,
    total: raw.numTotalTests,
    passed: raw.numPassedTests,
    failed: raw.numFailedTests,
    pending: raw.numPendingTests,
    todo: raw.numTodoTests,
  };
  report.duplicateTitleCatalogue = compatibility
    ? JSON.parse(
        readFileSync(
          join(root, "tests/obsidian/compatibility/duplicateTitles.json"),
          "utf8",
        ),
      ).titles
    : [];
  report.tests = normalizeTestIdentities(
    report.tests,
    report.duplicateTitleCatalogue,
  );
  assert.ok(report.tests.length, "Zero discovered fork tests");
  assert.equal(
    new Set(report.tests.map((test) => test.testId)).size,
    report.tests.length,
    "Duplicate fork case IDs",
  );
  assert.deepEqual(
    sourceIdentity(root),
    before,
    "Source changed while tests were running",
  );
  if (coverage) {
    const summary = JSON.parse(
      readFileSync(join(output, "source/coverage-summary.json"), "utf8"),
    );
    const modules = productionModules(root);
    report.coverage = {
      engine: "vitest-v8",
      totals: summary.total,
      modules: Object.entries(summary)
        .filter(([path]) => path !== "total")
        .map(([path, c]) => ({
          path: relative(root, path).replaceAll("\\", "/"),
          lines: c.lines.pct,
          branches: c.branches.pct,
          functions: c.functions.pct,
          coveredLines: c.lines.covered,
        })),
    };
    report.excludedTypeOnlyModules = modules.typeOnly;
    report.unexecutedProductionModules = modules.runtime.filter(
      (path) =>
        !report.coverage.modules.some(
          (item) => item.path === path && item.coveredLines > 0,
        ),
    );
    report.customizationCoverage = ledger.customizations.map((group) => ({
      id: group.id,
      sourceFiles: ledger.files
        .filter(
          (file) =>
            file.ids.includes(group.id) && modules.runtime.includes(file.path),
        )
        .map((file) => ({
          path: file.path,
          executed: report.coverage.modules.some(
            (item) => item.path === file.path && item.coveredLines > 0,
          ),
        })),
    }));
  }
  report.status =
    result.status === 0 &&
    raw.success &&
    report.tests.every((test) => test.status === "passed")
      ? "passed"
      : "failed";
  report.rawStatus = {
    exitCode: result.status,
    total: raw.numTotalTests,
    passed: raw.numPassedTests,
    failed: raw.numFailedTests,
    pending: raw.numPendingTests,
    todo: raw.numTodoTests,
  };
} catch (error) {
  report.error = String(error.stack || error);
}
writeFileSync(
  join(output, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
writeReportFiles(report, output);
writeFileSync(
  join(output, "report.sha256"),
  `${createHash("sha256")
    .update(readFileSync(join(output, "report.json")))
    .digest("hex")}\n`,
);
console.log(`${suiteId}: ${report.status}; ${join(output, "report.json")}`);
if (report.error) {
  process.stderr.write(`${report.error}\n`);
}
process.exitCode = report.status === "passed" ? 0 : 1;
