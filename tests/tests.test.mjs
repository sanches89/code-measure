import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { measureTests, parseJunit, summarizeCases } from "../src/tests.mjs";
import { fixture, readFixture } from "./helpers.mjs";

const SETTINGS = { top: 20 };

test("parseJunit reads the report of the Node.js test runner, with test cases under the root", () => {
  const outcomes = parseJunit(readFixture("reports/junit-node.xml")).map((c) => [c.name, c.outcome]);
  assert.deepEqual(outcomes, [
    ["test grade returns A for 95", "passed"],
    ["test grade returns F for 10", "passed"],
    ["test grade fails on purpose", "failed"],
    ["test grade skipped", "skipped"],
  ]);
});

test("parseJunit reads nested suites once each, with failure, error, and skipped", () => {
  const cases = parseJunit(readFixture("reports/junit-nested.xml"));
  assert.deepEqual(cases.map((c) => c.outcome), ["passed", "failed", "failed", "skipped", "passed"]);
});

test("parseJunit decodes entities in a test name and reads the time", () => {
  assert.deepEqual(parseJunit(readFixture("reports/junit-nested.xml"))[0], { name: "outer passes & escapes", outcome: "passed", seconds: 0.25 });
});

test("parseJunit returns nothing for XML that is not JUnit", () => {
  assert.deepEqual(parseJunit("<coverage><testcase name='x'/></coverage>"), []);
});

test("summarizeCases counts the outcomes and names the failed and the slowest tests", () => {
  const summary = summarizeCases(parseJunit(readFixture("reports/junit-nested.xml")), 20);
  assert.equal(summary.total, 5);
  assert.equal(summary.passed, 2);
  assert.equal(summary.failed, 2);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.seconds, 1.5);
  assert.deepEqual(summary.failedTests, ["inner fails", "inner errors"]);
  assert.deepEqual(summary.slowest[0], { name: "inner fails", seconds: 1 });
});

test("measureTests is skipped and marked as not requested without a report", () => {
  assert.deepEqual(measureTests([], SETTINGS), { status: "skipped", reason: "no --test-report given", notRequested: true });
});

test("measureTests reads every XML file of a folder", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "code-measure-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, "a.xml"), readFixture("reports/junit-node.xml"));
  writeFileSync(join(dir, "b.xml"), readFixture("reports/junit-nested.xml"));
  writeFileSync(join(dir, "notes.txt"), "not a report");
  const summary = measureTests([dir], SETTINGS);
  assert.equal(summary.status, "ok");
  assert.equal(summary.reports, 2);
  assert.equal(summary.total, 9);
});

test("measureTests fails with a reason for a file without test cases", () => {
  const summary = measureTests([fixture("reports/lcov.info")], SETTINGS);
  assert.equal(summary.status, "failed");
  assert.match(summary.reason, /no <testcase> found/);
});
