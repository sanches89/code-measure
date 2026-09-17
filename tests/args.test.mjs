import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEFAULTS, parseArgs, UsageError } from "../src/args.mjs";

const usageError = (argv, pattern) => assert.throws(() => parseArgs(argv), (error) => error instanceof UsageError && pattern.test(error.message));

test("parseArgs returns the defaults and the current directory without arguments", () => {
  const args = parseArgs([]);
  assert.deepEqual(args.settings, DEFAULTS);
  assert.deepEqual(args.paths, ["."]);
  assert.equal(args.before, null);
});

test("parseArgs reads limits, globs, skips, and repeated reports", () => {
  const args = parseArgs(["src", "--ccn", "7", "--ignore", "**/gen/**, **/vendor/**", "--skip", "hotspots,complexity", "--test-report", "package.json", "--test-report", "src", "--coverage-report", "package.json"]);
  assert.deepEqual(args.paths, ["src"]);
  assert.equal(args.settings.ccn, 7);
  assert.deepEqual(args.settings.ignore, ["**/gen/**", "**/vendor/**"]);
  assert.deepEqual(args.skip, ["hotspots", "complexity"]);
  assert.deepEqual(args.testReports, ["package.json", "src"]);
  assert.deepEqual(args.coverageReports, ["package.json"]);
});

test("parseArgs rejects an unknown option", () => usageError(["--bogus"], /unknown option --bogus/));
test("parseArgs rejects an option without a value", () => usageError(["--top"], /--top needs a value/));
test("parseArgs rejects a limit that is not a whole number", () => usageError(["--ccn", "x"], /--ccn needs a whole number/));
test("parseArgs rejects an unknown measurement in --skip", () => usageError(["--skip", "foo"], /--skip got foo/));
test("parseArgs rejects a path that does not exist", () => usageError(["no-such-folder"], /path not found: no-such-folder/));
test("parseArgs rejects a report that does not exist", () => usageError(["--coverage-report", "no-such.info"], /report not found: no-such.info/));

test("parseArgs with --compare reuses the limits and the paths of the saved summary", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "code-measure-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "before.json");
  writeFileSync(file, JSON.stringify({ version: 1, paths: ["src"], settings: { ...DEFAULTS, ccn: 3, ignore: ["**/gen/**"], since: "1 month ago" } }));
  const args = parseArgs(["--compare", file]);
  assert.equal(args.settings.ccn, 3);
  assert.deepEqual(args.settings.ignore, ["**/gen/**"]);
  assert.equal(args.settings.since, "1 month ago");
  assert.deepEqual(args.paths, ["src"]);
  assert.equal(args.before.version, 1);
});

test("parseArgs rejects a limit together with --compare", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "code-measure-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "before.json");
  writeFileSync(file, JSON.stringify({ version: 1, paths: ["src"], settings: DEFAULTS }));
  usageError(["--compare", file, "--ccn", "5"], /--ccn cannot be combined with --compare/);
});

test("parseArgs rejects a --compare file that is not a summary", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "code-measure-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "other.json");
  writeFileSync(file, JSON.stringify({ hello: "world" }));
  usageError(["--compare", file], /is not a summary of this tool/);
});
