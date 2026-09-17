import assert from "node:assert/strict";
import test from "node:test";
import { compare } from "../src/compare.mjs";

const ok = (values) => ({ status: "ok", ...values });
const unasked = { status: "skipped", reason: "no report given", notRequested: true };
const summary = (parts) => ({
  duplication: ok({ duplicatedLines: 10, clones: 2 }),
  complexity: ok({ maxCcn: 12, overLimit: { ccn: 3, length: 1, params: 0 } }),
  tests: unasked,
  coverage: unasked,
  ...parts,
});

test("compare finds nothing worse between two equal summaries", () => {
  const result = compare(summary(), summary());
  assert.deepEqual(result.worse, []);
  assert.deepEqual(result.notCompared, []);
  assert.deepEqual(result.delta["complexity.maxCcn"], { before: 12, after: 12 });
});

test("compare names a value that rose and ignores a value that fell", () => {
  const after = summary({ duplication: ok({ duplicatedLines: 4, clones: 3 }) });
  assert.deepEqual(compare(summary(), after).worse, ["duplication.clones"]);
});

test("compare treats a lower test total as worse and a higher one as fine", () => {
  const tests = (total) => ok({ total, failed: 0, skipped: 0 });
  assert.deepEqual(compare(summary({ tests: tests(10) }), summary({ tests: tests(9) })).worse, ["tests.total"]);
  assert.deepEqual(compare(summary({ tests: tests(10) }), summary({ tests: tests(14) })).worse, []);
});

test("compare treats more failed tests, skipped tests, uncovered lines, and uncovered branches as worse", () => {
  const before = summary({ tests: ok({ total: 5, failed: 0, skipped: 0 }), coverage: ok({ lines: { uncovered: 4 }, branches: { uncovered: 1 } }) });
  const after = summary({ tests: ok({ total: 5, failed: 1, skipped: 2 }), coverage: ok({ lines: { uncovered: 5 }, branches: { uncovered: 2 } }) });
  assert.deepEqual(compare(before, after).worse, ["tests.failed", "tests.skipped", "coverage.lines.uncovered", "coverage.branches.uncovered"]);
});

test("compare skips branch coverage when a report has no branch data", () => {
  const coverage = ok({ lines: { uncovered: 4 }, branches: null });
  const result = compare(summary({ coverage }), summary({ coverage }));
  assert.equal("coverage.branches.uncovered" in result.delta, false);
  assert.deepEqual(result.worse, []);
});

test("compare lists a measurement that only one run has as not compared", () => {
  const before = summary({ tests: ok({ total: 5, failed: 0, skipped: 0 }) });
  assert.deepEqual(compare(before, summary()).notCompared, ["tests"]);
});

test("compare lists a measurement that a run skipped for a missing tool as not compared", () => {
  const after = summary({ complexity: { status: "skipped", reason: "lizard not found" } });
  assert.deepEqual(compare(summary(), after).notCompared, ["complexity"]);
});

test("compare reads a summary saved before tests and coverage existed", () => {
  const { tests, coverage, ...old } = summary();
  assert.deepEqual(compare(old, summary()).notCompared, []);
});
