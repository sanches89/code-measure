import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { before } from "node:test";
import { compare } from "../src/compare.mjs";
import { createResolver } from "../src/coverage/resolve.mjs";
import { isCode, listFiles } from "../src/files.mjs";
import { readReport } from "../src/mutation/formats.mjs";
import { functionAt, measureMutation, summarizeMutation } from "../src/mutation/index.mjs";
import { fixture, projectDir, readFixture } from "./helpers.mjs";

// The resolver reads paths relative to the current directory, as the CLI does from a project root.
before(() => process.chdir(projectDir));

const everyFile = () => listFiles(["."], []);
const codeFiles = (paths = ["."], ignore = []) => listFiles(paths, ignore).filter(isCode);
const measure = (names, { top = 20, functions = null, files = codeFiles() } = {}) =>
  measureMutation({ mutationReports: names.map((name) => fixture(`reports/${name}`)), codeFiles: files, functions, everyFile, settings: { top } });
const counts = (s) => ({ mutants: s.mutants, killed: s.killed, timeout: s.timeout, survived: s.survived, noCoverage: s.noCoverage, invalid: s.invalid, ignored: s.ignored });
const statusesOf = (text) => readReport(text).mutants.map((m) => m.status);

test("readReport tells the four formats apart and rejects other text", () => {
  assert.equal(readReport(readFixture("reports/stryker.json")).format, "stryker");
  assert.equal(readReport(readFixture("reports/pit-mutations.xml")).format, "pit");
  assert.equal(readReport(readFixture("reports/cargo-mutants-outcomes.json")).format, "cargo-mutants");
  assert.equal(readReport(readFixture("reports/infection.json")).format, "infection");
  assert.equal(readReport(readFixture("reports/lcov.info")), null);
  assert.equal(readReport(readFixture("reports/junit-node.xml")), null);
  assert.equal(readReport('{ "hello": "world" }'), null);
});

test("Stryker statuses map to the buckets, and an unknown status is ignored", () => {
  const statuses = ["Killed", "Survived", "Timeout", "NoCoverage", "CompileError", "RuntimeError", "Ignored", "Pending", "Mystery", "constructor"];
  const mutants = statuses.map((status, i) => ({ id: String(i), mutatorName: "M", location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } }, status }));
  const text = JSON.stringify({ schemaVersion: "2", thresholds: { high: 80, low: 60 }, files: { "src/calc.mjs": { language: "javascript", source: "", mutants } } });
  assert.deepEqual(statusesOf(text), ["killed", "survived", "timeout", "noCoverage", "invalid", "invalid", "ignored", "ignored", "ignored", "ignored"]);
});

test("PIT statuses map to the buckets, and an unknown status is ignored", () => {
  const statuses = ["KILLED", "SURVIVED", "TIMED_OUT", "MEMORY_ERROR", "NO_COVERAGE", "NON_VIABLE", "RUN_ERROR", "EQUIVALENT", "NOT_STARTED", "STARTED", "MYSTERY"];
  const rows = statuses.map((status) => `<mutation status='${status}'><sourceFile>Calc.java</sourceFile><mutatedClass>com.acme.Calc</mutatedClass><lineNumber>4</lineNumber></mutation>`);
  assert.deepEqual(statusesOf(`<?xml version="1.0"?>\n<mutations partial="false">\n${rows.join("\n")}\n</mutations>\n`), [
    "killed", "survived", "timeout", "timeout", "noCoverage", "invalid", "invalid", "ignored", "ignored", "ignored", "ignored",
  ]);
});

test("cargo-mutants summaries map to the buckets, without the baseline, and an unknown summary is ignored", () => {
  const summaries = ["CaughtMutant", "MissedMutant", "Timeout", "Unviable", "Failure", "Success"];
  const outcomes = [{ scenario: "Baseline", summary: "Success" }, ...summaries.map((summary) => ({ scenario: { Mutant: { file: "src/lib.rs", span: { start: { line: 2, column: 1 } }, genre: "FnValue" } }, summary }))];
  assert.deepEqual(statusesOf(JSON.stringify({ outcomes, cargo_mutants_version: "25.3.1" })), ["killed", "survived", "timeout", "invalid", "invalid", "ignored"]);
});

test("Infection outcome lists map to the buckets", () => {
  const entry = { mutator: { mutatorName: "LessThan", originalFilePath: "/demo/src/Calc.php", originalStartLine: 11 }, diff: "" };
  const keys = ["killed", "killedByStaticAnalysis", "escaped", "timeouted", "uncovered", "errored", "syntaxErrors", "ignored"];
  const log = { stats: { skippedCount: 0 }, ...Object.fromEntries(keys.map((key) => [key, [entry]])) };
  assert.deepEqual(statusesOf(JSON.stringify(log)), ["killed", "killed", "survived", "timeout", "noCoverage", "invalid", "invalid", "ignored"]);
});

test("each fixture report counts into the six buckets, with the score of killed and timed out mutants", () => {
  const expected = {
    "stryker.json": [{ mutants: 11, killed: 4, timeout: 1, survived: 4, noCoverage: 2, invalid: 2, ignored: 2 }, 45.45, 2],
    "pit-mutations.xml": [{ mutants: 8, killed: 2, timeout: 2, survived: 2, noCoverage: 2, invalid: 1, ignored: 0 }, 50, 1],
    "cargo-mutants-outcomes.json": [{ mutants: 12, killed: 7, timeout: 1, survived: 4, noCoverage: 0, invalid: 2, ignored: 0 }, 66.67, 1],
    // stats.skippedCount adds one ignored mutant that has no file.
    "infection.json": [{ mutants: 6, killed: 3, timeout: 1, survived: 1, noCoverage: 1, invalid: 0, ignored: 1 }, 66.67, 1],
  };
  for (const [name, [buckets, score, files]] of Object.entries(expected)) {
    const summary = measure([name]);
    assert.equal(summary.status, "ok", name);
    assert.deepEqual(counts(summary), buckets, name);
    assert.equal(summary.score, score, name);
    assert.equal(summary.files, files, name);
  }
});

test("PIT's package and source file, an inner class included, resolve to one Java file", () => {
  const summary = measure(["pit-mutations.xml"]);
  assert.deepEqual(summary.top, [{ file: "java/src/main/java/com/acme/Calc.java", mutants: 8, survived: 2, noCoverage: 2, score: 50 }]);
  assert.deepEqual(summary.survivors.map((s) => [s.line, s.mutator]), [[4, "ConditionalsBoundaryMutator"], [7, "PrimitiveReturnsMutator"]]);
});

test("a tree-relative cargo-mutants path and an absolute Infection path resolve to the measured file", () => {
  assert.deepEqual(measure(["cargo-mutants-outcomes.json"]).top.map((f) => f.file), ["rust/src/lib.rs"]);
  assert.deepEqual(measure(["infection.json"]).top.map((f) => f.file), ["php/src/Calc.php"]);
});

test("Stryker's projectRoot is a source root for its file keys", () => {
  const report = (projectRoot) => ({ format: "stryker", sources: projectRoot ? [projectRoot] : [], skipped: 0, mutants: [{ name: "app/calc.py", line: 2, function: null, mutator: "EqualityOperator", change: "score >= 90", status: "survived" }] });
  const files = codeFiles();
  const summarize = (projectRoot) => summarizeMutation({ reports: [report(projectRoot)], functions: null, resolve: createResolver(new Set(files), everyFile), top: 20 });
  assert.deepEqual(summarize(join(projectDir, "pysrc")).survivors.map((s) => s.file), ["pysrc/app/calc.py"]);
  // Without the root, pysrc/app/calc.py and other/app/calc.py share the tail app/calc.py.
  assert.equal(summarize(null).status, "failed");
});

test("mutants of files outside the paths or matched by --ignore are left out", () => {
  const ignored = measure(["stryker.json"], { files: codeFiles(["."], ["**/calc.mjs"]) });
  assert.deepEqual([ignored.files, ignored.survivors.map((s) => s.file)], [1, ["src/unused.mjs"]]);
  const outside = measure(["stryker.json", "cargo-mutants-outcomes.json"], { files: codeFiles(["rust"]) });
  assert.deepEqual([outside.format, outside.files, outside.mutants], ["stryker,cargo-mutants", 1, 12]);
});

test("the mutation part fails with a reason when no mutant is in a file under the paths", () => {
  const summary = measure(["stryker.json"], { files: codeFiles(["rust"]) });
  assert.equal(summary.status, "failed");
  assert.equal(summary.format, "stryker");
  assert.match(summary.reason, /none of the 2 file\(s\) in the mutation report is a file under the paths/);
});

test("functionAt picks the innermost function around a line", () => {
  const functions = [{ function: "outer", line: 1, end: 20 }, { function: "inner", line: 5, end: 8 }, { function: "later", line: 22, end: 30 }];
  assert.equal(functionAt(functions, 6), "inner");
  assert.equal(functionAt(functions, 2), "outer");
  assert.equal(functionAt(functions, 21), null);
  assert.equal(functionAt(functions, null), null);
});

test("a survivor's function comes from lizard, else from the report, else null", () => {
  const lizard = [
    { function: "grade", file: "src/calc.mjs", line: 1, end: 11 },
    { function: "Calc::abs", file: "java/src/main/java/com/acme/Calc.java", line: 3, end: 8 },
  ];
  const functionsOf = (name, functions) => measure([name], { functions }).survivors.map((s) => s.function);
  assert.deepEqual(functionsOf("stryker.json", lizard), ["grade", "grade", "grade", null]);
  assert.deepEqual(functionsOf("stryker.json", null), [null, null, null, null]);
  assert.deepEqual(functionsOf("pit-mutations.xml", lizard), ["Calc::abs", "Calc::abs"]);
  assert.deepEqual(functionsOf("pit-mutations.xml", null), ["abs", "abs"]);
  assert.deepEqual(functionsOf("cargo-mutants-outcomes.json", null), ["clamp", "clamp", "is_even", "is_even"]);
  assert.deepEqual(functionsOf("infection.json", null), [null]);
});

test("a survivor's change is the replacement, the description, or the first added line of the diff", () => {
  assert.deepEqual(measure(["stryker.json"]).survivors[0], { file: "src/calc.mjs", line: 2, function: null, mutator: "LogicalOperator", change: "score < 0 && score > 100" });
  assert.equal(measure(["pit-mutations.xml"]).survivors[0].change, "changed conditional boundary");
  assert.equal(measure(["cargo-mutants-outcomes.json"]).survivors[0].change, "==");
  assert.deepEqual(measure(["infection.json"]).survivors, [{ file: "php/src/Calc.php", line: 11, function: null, mutator: "LessThan", change: "if ($a <= 0) {" }]);

  const mutant = (extra) => ({ id: "1", mutatorName: "M", location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } }, status: "Survived", ...extra });
  const changes = readReport(JSON.stringify({ schemaVersion: "2", files: { "a.js": { mutants: [mutant({ description: "removed\n  a   call" }), mutant({ replacement: "x".repeat(200) }), mutant({})] } } })).mutants.map((m) => m.change);
  assert.deepEqual(changes, ["removed a call", "x".repeat(160), null]);
});

// A resolver that keeps every name: the mutants below are not files of the fixture project.
const same = (name) => name;
const synthetic = (mutants, format = "stryker") => ({ format, sources: [], skipped: 0, mutants: mutants.map(([name, line, status, change = null]) => ({ name, line, function: null, mutator: "M", change: change ?? `${name}:${line}`, status })) });

test("top sorts files by survived, then not covered, then name, and survivors by their file's survived count, name, and line", () => {
  const report = synthetic([
    ["b.js", 9, "survived"], ["b.js", 3, "survived"],
    ["c.js", 1, "survived"], ["c.js", 2, "noCoverage"], ["c.js", 3, "noCoverage"],
    ["a.js", 7, "survived"], ["a.js", 5, "survived"], ["a.js", 6, "killed"],
    ["d.js", 1, "noCoverage"],
    ["e.js", 1, "killed"],
  ]);
  const summary = summarizeMutation({ reports: [report], functions: null, resolve: same, top: 20 });
  assert.deepEqual(summary.top, [
    { file: "a.js", mutants: 3, survived: 2, noCoverage: 0, score: 33.33 },
    { file: "b.js", mutants: 2, survived: 2, noCoverage: 0, score: 0 },
    { file: "c.js", mutants: 3, survived: 1, noCoverage: 2, score: 0 },
    { file: "d.js", mutants: 1, survived: 0, noCoverage: 1, score: 0 },
  ]);
  assert.deepEqual(summary.survivors.map((s) => `${s.file}:${s.line}`), ["a.js:5", "a.js:7", "b.js:3", "b.js:9", "c.js:1"]);

  const cut = summarizeMutation({ reports: [report], functions: null, resolve: same, top: 3 });
  assert.deepEqual(cut.top.map((f) => f.file), ["a.js", "b.js", "c.js"]);
  assert.deepEqual(cut.survivors.map((s) => `${s.file}:${s.line}`), ["a.js:5", "a.js:7", "b.js:3"]);
});

test("reports of different formats merge into one measurement", () => {
  const summary = measure(["stryker.json", "pit-mutations.xml", "cargo-mutants-outcomes.json", "infection.json"]);
  assert.equal(summary.format, "stryker,pit,cargo-mutants,infection");
  assert.equal(summary.files, 5);
  assert.deepEqual(counts(summary), { mutants: 37, killed: 16, timeout: 5, survived: 11, noCoverage: 5, invalid: 5, ignored: 3 });
  assert.equal(summary.score, 56.76);
  assert.deepEqual(summary.top.map((f) => [f.file, f.survived, f.noCoverage]), [
    ["rust/src/lib.rs", 4, 0],
    ["src/calc.mjs", 3, 2],
    ["java/src/main/java/com/acme/Calc.java", 2, 2],
    ["php/src/Calc.php", 1, 1],
    ["src/unused.mjs", 1, 0],
  ]);
});

test("a mutant that two reports name counts once, with the most detected status", () => {
  assert.deepEqual(counts(measure(["stryker.json", "stryker.json"])), counts(measure(["stryker.json"])));
  const first = synthetic([["a.js", 1, "survived", "x"], ["a.js", 2, "noCoverage", "y"]]);
  const second = synthetic([["a.js", 1, "killed", "x"], ["a.js", 2, "invalid", "y"]], "pit");
  const summary = summarizeMutation({ reports: [first, second], functions: null, resolve: same, top: 20 });
  assert.deepEqual(counts(summary), { mutants: 2, killed: 1, timeout: 0, survived: 0, noCoverage: 1, invalid: 0, ignored: 0 });
});

test("look-alike mutants of one report all count, and pair up with their twins of another report", () => {
  const twice = synthetic([["a.js", 4, "survived", "negated conditional"], ["a.js", 4, "survived", "negated conditional"]]);
  assert.equal(summarizeMutation({ reports: [twice], functions: null, resolve: same, top: 20 }).survived, 2);
  assert.equal(summarizeMutation({ reports: [twice, twice], functions: null, resolve: same, top: 20 }).survived, 2);
});

test("measureMutation fails with a reason for an unknown format and for invalid JSON", (t) => {
  const unknown = measureMutation({ mutationReports: [fixture("reports/lcov.info")], codeFiles: [], functions: null, everyFile, settings: { top: 20 } });
  assert.equal(unknown.status, "failed");
  assert.match(unknown.reason, /is not a Stryker mutation-testing-report JSON, a PIT mutations\.xml, a cargo-mutants outcomes\.json, or an Infection JSON log/);

  const dir = mkdtempSync(join(tmpdir(), "code-measure-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const broken = join(dir, "mutation.json");
  writeFileSync(broken, '{ "schemaVersion": ');
  const invalid = measureMutation({ mutationReports: [broken], codeFiles: [], functions: null, everyFile, settings: { top: 20 } });
  assert.equal(invalid.status, "failed");
  assert.match(invalid.reason, /mutation\.json is not valid JSON: /);
});

test("measureMutation is skipped and marked as not requested without a report", () => {
  assert.deepEqual(measureMutation({ mutationReports: [], codeFiles: [], functions: null, everyFile, settings: { top: 20 } }), { status: "skipped", reason: "no --mutation-report given", notRequested: true });
});

const withMutation = (survived, noCoverage, score) => ({ mutation: { status: "ok", survived, noCoverage, score } });

test("compare treats more surviving and more uncovered mutants as worse, and ignores the score", () => {
  const result = compare(withMutation(3, 2, 80), withMutation(4, 3, 90));
  assert.deepEqual(result.worse, ["mutation.survived", "mutation.noCoverage"]);
  assert.deepEqual(Object.keys(result.delta), ["mutation.survived", "mutation.noCoverage"]);
  assert.deepEqual(compare(withMutation(3, 2, 80), withMutation(2, 1, 50)).worse, []);
});

test("compare reads a base summary saved before mutation existed as not requested", () => {
  assert.deepEqual(compare({}, withMutation(1, 1, 50)).notCompared, ["mutation"]);
  assert.deepEqual(compare({}, { mutation: { status: "skipped", reason: "no --mutation-report given", notRequested: true } }).notCompared, []);
});
