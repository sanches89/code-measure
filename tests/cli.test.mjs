import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { binFile, fixture, projectDir, readFixture } from "./helpers.mjs";

// No network and no lizard in these runs: the three tool measurements are skipped.
const SKIP = ["--skip", "duplication,complexity,hotspots"];
const cli = (...args) => spawnSync(process.execPath, [binFile, ...args], { cwd: projectDir, encoding: "utf8" });

test("--help prints the usage and exits 0", () => {
  const result = cli("--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Usage: code-measure/);
});

test("--version prints a semantic version", () => {
  assert.match(cli("--version").stdout, /^\d+\.\d+\.\d+\n$/);
});

test("an unknown option exits 2 with the error on stderr and nothing on stdout", () => {
  const result = cli("--bogus");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^Error: unknown option --bogus/);
  assert.equal(result.stdout, "");
});

test("a run prints one JSON summary with the tests and the coverage of the paths", () => {
  const result = cli("src", ...SKIP, "--test-report", fixture("reports/junit-node.xml"), "--coverage-report", fixture("reports/lcov.info"));
  assert.equal(result.status, 0);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.version, 1);
  assert.deepEqual(summary.paths, ["src"]);
  assert.equal(summary.files, 2);
  assert.deepEqual(summary.duplication, { status: "skipped", reason: "named in --skip" });
  assert.deepEqual([summary.tests.total, summary.tests.failed, summary.tests.skipped], [4, 1, 1]);
  assert.equal(summary.coverage.lines.percentage, 50);
  assert.equal(summary.coverage.branches.percentage, 75);
});

test("a run with --mutation-report prints the mutation part, and a missing mutation report exits 2", () => {
  const result = cli("src", ...SKIP, "--mutation-report", fixture("reports/stryker.json"));
  assert.equal(result.status, 0);
  const { mutation } = JSON.parse(result.stdout);
  assert.deepEqual([mutation.status, mutation.format, mutation.mutants, mutation.survived, mutation.score], ["ok", "stryker", 11, 4, 45.45]);

  const missing = cli("src", ...SKIP, "--mutation-report", "no-such.json");
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /^Error: report not found: no-such.json/);
});

test("--compare exits 3 and names what got worse when a test is gone and a line lost its coverage", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "code-measure-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const beforeFile = join(dir, "before.json");
  const first = cli("src", ...SKIP, "--test-report", fixture("reports/junit-node.xml"), "--coverage-report", fixture("reports/lcov.info"));
  writeFileSync(beforeFile, first.stdout);

  const junit = join(dir, "junit.xml");
  const lcov = join(dir, "lcov.info");
  writeFileSync(junit, readFixture("reports/junit-node.xml").replace(/<testcase name="grade returns F for 10"[^>]*\/>/, ""));
  writeFileSync(lcov, readFixture("reports/lcov.info").replace("\nDA:5,3\n", "\nDA:5,0\n"));

  const second = cli("--compare", beforeFile, ...SKIP, "--test-report", junit, "--coverage-report", lcov);
  assert.equal(second.status, 3);
  const summary = JSON.parse(second.stdout);
  assert.deepEqual(summary.worse, ["tests.total", "coverage.lines.uncovered"]);
  assert.deepEqual(summary.delta["tests.total"], { before: 4, after: 3 });
  assert.deepEqual(summary.paths, ["src"]);
});

test("--compare exits 0 when nothing got worse", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "code-measure-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const beforeFile = join(dir, "before.json");
  const reports = ["--test-report", fixture("reports/junit-node.xml"), "--coverage-report", fixture("reports/lcov.info")];
  writeFileSync(beforeFile, cli("src", ...SKIP, ...reports).stdout);
  const second = cli("--compare", beforeFile, ...SKIP, ...reports);
  assert.equal(second.status, 0);
  assert.deepEqual(JSON.parse(second.stdout).worse, []);
});
