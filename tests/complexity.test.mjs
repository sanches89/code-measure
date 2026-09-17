import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS } from "../src/args.mjs";
import { parseCsv, parseLizardCsv, summarizeFunctions } from "../src/complexity.mjs";

test("parseCsv keeps a comma inside a quoted field", () => {
  assert.deepEqual(parseCsv('1,"f ( a , b )",2\n'), [["1", "f ( a , b )", "2"]]);
});

test("parseCsv reads a doubled quote as one quote", () => {
  assert.deepEqual(parseCsv('"say ""hi""",x\r\n'), [['say "hi"', "x"]]);
});

test("parseCsv reads the last row without a line break", () => {
  assert.deepEqual(parseCsv("a,b\nc,d"), [["a", "b"], ["c", "d"]]);
});

const CSV = [
  '7,2,31,1,7,"atBase@59-65@src/audit.mjs","src/audit.mjs","atBase","atBase ( path )",59,65',
  '60,12,300,5,70,"big@1-70@src/big.mjs","src/big.mjs","big","big ( a , b , c , d , e )",1,70',
].join("\n");

test("parseLizardCsv maps the columns of lizard to a function", () => {
  assert.deepEqual(parseLizardCsv(CSV)[0], { function: "atBase", file: "src/audit.mjs", line: 59, end: 65, ccn: 2, length: 7, params: 1 });
});

test("summarizeFunctions counts the functions over each limit", () => {
  const summary = summarizeFunctions(parseLizardCsv(CSV), DEFAULTS);
  assert.equal(summary.functions, 2);
  assert.equal(summary.maxCcn, 12);
  assert.deepEqual(summary.overLimit, { ccn: 1, length: 1, params: 1 });
});

test("summarizeFunctions lists only functions over a limit, without the end line", () => {
  const summary = summarizeFunctions(parseLizardCsv(CSV), DEFAULTS);
  assert.deepEqual(summary.top, [{ function: "big", file: "src/big.mjs", line: 1, ccn: 12, length: 70, params: 5 }]);
});

test("summarizeFunctions sums ccn per file for the hotspots", () => {
  assert.deepEqual(summarizeFunctions(parseLizardCsv(CSV), DEFAULTS).perFile, { "src/audit.mjs": 2, "src/big.mjs": 12 });
});
