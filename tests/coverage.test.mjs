import assert from "node:assert/strict";
import test, { before } from "node:test";
import { coverFunctions, crap, measureCoverage, summarizeCoverage } from "../src/coverage/index.mjs";
import { detectFormat, readReport } from "../src/coverage/formats.mjs";
import { createResolver } from "../src/coverage/resolve.mjs";
import { listFiles } from "../src/files.mjs";
import { fixture, projectDir, readFixture } from "./helpers.mjs";

// The resolver reads paths relative to the current directory, as the CLI does from a project root.
before(() => process.chdir(projectDir));

const read = (name) => {
  const data = new Map();
  const sources = [];
  const format = readReport(readFixture(`reports/${name}`), data, sources);
  return { data, sources, format };
};
const hits = (entry) => Object.fromEntries(entry.lines);
const everyFile = () => listFiles(["."], []);

test("detectFormat tells the four formats apart and rejects other text", () => {
  assert.equal(detectFormat(readFixture("reports/lcov.info")), "lcov");
  assert.equal(detectFormat(readFixture("reports/cobertura.xml")), "cobertura");
  assert.equal(detectFormat(readFixture("reports/jacoco.xml")), "jacoco");
  assert.equal(detectFormat(readFixture("reports/go.cover")), "go");
  assert.equal(detectFormat("hello"), null);
});

test("LCOV gives hits per line and one branch per BRDA record", () => {
  const { data } = read("lcov.info");
  const entry = data.get("src/calc.mjs");
  assert.equal(entry.lines.size, 18);
  assert.equal(entry.lines.get(3), 0);
  assert.equal(entry.lines.get(5), 3);
  assert.equal(entry.branches.size, 8);
  assert.deepEqual(entry.branches.get("2,2,0"), { line: 2, covered: 0, total: 1 });
});

test("Cobertura gives hits per line, branches from condition-coverage, and the source roots", () => {
  const { data, sources } = read("cobertura.xml");
  assert.deepEqual(sources, ["pysrc"]);
  assert.deepEqual(hits(data.get("app/calc.py")), { 1: 1, 2: 1, 3: 0, 4: 1, 6: 1, 7: 0 });
  assert.deepEqual([...data.get("app/calc.py").branches.values()], [{ line: 2, covered: 1, total: 2 }]);
});

test("JaCoCo joins the package and the source file, and reads covered instructions as hits", () => {
  const { data } = read("jacoco.xml");
  assert.deepEqual(hits(data.get("com/acme/Calc.java")), { 4: 2, 5: 0, 7: 2 });
  assert.deepEqual([...data.get("com/acme/Calc.java").branches.values()], [{ line: 4, covered: 1, total: 2 }]);
});

test("a Go cover profile marks every line of a block and has no branches", () => {
  const { data } = read("go.cover");
  const entry = data.get("example.com/demo/pkg/calc/calc.go");
  assert.deepEqual(hits(entry), { 3: 1, 4: 1, 5: 0, 6: 0, 7: 1 });
  assert.equal(entry.branches.size, 0);
});

test("the resolver finds a path relative to the project", () => {
  const resolve = createResolver(new Set(["src/calc.mjs"]), everyFile);
  assert.equal(resolve("src/calc.mjs"), "src/calc.mjs");
});

test("the resolver finds a path relative to a source root", () => {
  const resolve = createResolver(new Set(["pysrc/app/calc.py"]), everyFile);
  assert.equal(resolve("app/calc.py", ["pysrc"]), "pysrc/app/calc.py");
});

test("the resolver never maps a real file outside the paths to a look-alike inside them", () => {
  const resolve = createResolver(new Set(["other/app/calc.py"]), everyFile);
  assert.equal(resolve("app/calc.py", ["pysrc"]), null);
});

test("the resolver finds a package path and an import path by their unique tail", () => {
  const resolve = createResolver(new Set(["java/src/main/java/com/acme/Calc.java", "gomod/pkg/calc/calc.go"]), everyFile);
  assert.equal(resolve("com/acme/Calc.java"), "java/src/main/java/com/acme/Calc.java");
  assert.equal(resolve("example.com/demo/pkg/calc/calc.go"), "gomod/pkg/calc/calc.go");
});

test("the resolver returns null for a tail that two files share", () => {
  const resolve = createResolver(new Set(["pysrc/app/calc.py", "other/app/calc.py"]), everyFile);
  assert.equal(resolve("somewhere/else/app/calc.py"), null);
});

test("crap is ccn for full coverage and ccn squared plus ccn for none", () => {
  assert.equal(crap(6, 1), 6);
  assert.equal(crap(6, 0), 42);
  assert.equal(crap(6, 0.5), 10.5);
});

const FUNCTIONS = [
  { function: "grade", file: "src/calc.mjs", line: 1, end: 11, ccn: 6 },
  { function: "neverCalled", file: "src/calc.mjs", line: 13, end: 18, ccn: 2 },
  { function: "orphan", file: "src/unused.mjs", line: 1, end: 3, ccn: 2 },
];

test("summarizeCoverage totals lines and branches of the files under the paths", () => {
  const { data, sources, format } = read("lcov.info");
  const codeFiles = ["src/calc.mjs", "src/unused.mjs"];
  const summary = summarizeCoverage({ data, sources, formats: new Set([format]), codeFiles, functions: FUNCTIONS, resolve: createResolver(new Set(codeFiles), everyFile), top: 20 });
  assert.equal(summary.status, "ok");
  assert.deepEqual(summary.lines, { total: 18, covered: 9, uncovered: 9, percentage: 50 });
  assert.deepEqual(summary.branches, { total: 8, covered: 6, uncovered: 2, percentage: 75 });
  assert.deepEqual(summary.filesNotInReport, ["src/unused.mjs"]);
  assert.deepEqual(summary.top, [{ file: "src/calc.mjs", lines: 50, branches: 75, uncoveredLines: 9, uncoveredBranches: 2 }]);
});

test("coverFunctions ranks by CRAP and counts a function of a file that the report lacks as not covered", () => {
  const { data } = read("lcov.info");
  const result = coverFunctions(FUNCTIONS, new Map([["src/calc.mjs", data.get("src/calc.mjs")]]), 20);
  assert.deepEqual({ covered: result.covered, partly: result.partly, none: result.none }, { covered: 0, partly: 2, none: 1 });
  assert.deepEqual(result.top.map((f) => [f.function, f.lines, f.branches, f.crap]), [
    ["grade", 63.64, 75, 7.7],
    ["orphan", 0, null, 6],
    ["neverCalled", 16.67, null, 4.3],
  ]);
});

test("coverFunctions counts a function as covered only with every line and every branch run", () => {
  const entry = { lines: new Map([[1, 1], [2, 1]]), branches: new Map([["2", { line: 2, covered: 1, total: 2 }]]) };
  const partly = coverFunctions([{ function: "f", file: "a", line: 1, end: 2, ccn: 2 }], new Map([["a", entry]]), 20);
  assert.equal(partly.partly, 1);
  entry.branches.set("2", { line: 2, covered: 2, total: 2 });
  const covered = coverFunctions([{ function: "f", file: "a", line: 1, end: 2, ccn: 2 }], new Map([["a", entry]]), 20);
  assert.deepEqual({ covered: covered.covered, top: covered.top }, { covered: 1, top: [] });
});

test("measureCoverage reads several reports of different formats in one run", () => {
  const codeFiles = ["gomod/pkg/calc/calc.go", "java/src/main/java/com/acme/Calc.java", "pysrc/app/calc.py"];
  const summary = measureCoverage({ coverageReports: ["cobertura.xml", "jacoco.xml", "go.cover"].map((f) => fixture(`reports/${f}`)), codeFiles, functions: null, everyFile, settings: { top: 20 } });
  assert.equal(summary.format, "cobertura,jacoco,go");
  assert.equal(summary.files, 3);
  assert.deepEqual(summary.lines, { total: 14, covered: 9, uncovered: 5, percentage: 64.29 });
  assert.deepEqual(summary.functions, { status: "skipped", reason: "needs the complexity measurement" });
});

test("measureCoverage fails with a reason when no file of the report is under the paths", () => {
  const summary = measureCoverage({ coverageReports: [fixture("reports/cobertura.xml")], codeFiles: ["other/app/calc.py"], functions: null, everyFile, settings: { top: 20 } });
  assert.equal(summary.status, "failed");
  assert.match(summary.reason, /none of the 1 file\(s\) in the report/);
});

test("measureCoverage fails with a reason for an unknown format", () => {
  const summary = measureCoverage({ coverageReports: [fixture("reports/junit-node.xml")], codeFiles: [], functions: null, everyFile, settings: { top: 20 } });
  assert.equal(summary.status, "failed");
  assert.match(summary.reason, /is not LCOV, Cobertura XML, JaCoCo XML, or a Go cover profile/);
});

test("measureCoverage is skipped and marked as not requested without a report", () => {
  assert.deepEqual(measureCoverage({ coverageReports: [], codeFiles: [], functions: null, everyFile, settings: { top: 20 } }), { status: "skipped", reason: "no --coverage-report given", notRequested: true });
});
