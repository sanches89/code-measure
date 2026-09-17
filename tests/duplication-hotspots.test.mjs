import assert from "node:assert/strict";
import test from "node:test";
import { summarizeJscpd } from "../src/duplication.mjs";
import { rankHotspots } from "../src/hotspots.mjs";

const side = (name, start, end) => ({ name, start, end });
const REPORT = {
  statistics: { total: { sources: 4, lines: 200, duplicatedLines: 30, percentage: 15.004 } },
  duplicates: [
    { lines: 10, tokens: 80, format: "typescript", firstFile: side("src/a.ts", 1, 10), secondFile: side("src/b.ts", 5, 14) },
    { lines: 20, tokens: 90, format: "typescript", firstFile: side("src/c.ts", 1, 20), secondFile: side("src/d.ts", 1, 20) },
  ],
};

test("summarizeJscpd reports the totals with a rounded percentage", () => {
  const summary = summarizeJscpd(REPORT, 20);
  assert.equal(summary.duplicatedLines, 30);
  assert.equal(summary.percentage, 15);
  assert.equal(summary.clones, 2);
});

test("summarizeJscpd lists the largest clone first, as two locations", () => {
  assert.deepEqual(summarizeJscpd(REPORT, 1).top, [{ lines: 20, tokens: 90, format: "typescript", a: "src/c.ts:1-20", b: "src/d.ts:1-20" }]);
});

test("summarizeJscpd reports zero for an empty report", () => {
  assert.deepEqual(summarizeJscpd({}, 20), { files: 0, lines: 0, duplicatedLines: 0, percentage: 0, clones: 0, top: [] });
});

test("rankHotspots multiplies commits by complexity and sorts by the score", () => {
  const top = rankHotspots({ "a.ts": 2, "b.ts": 10, "c.ts": 1 }, ["a.ts", "b.ts", "never-committed.ts"], (file) => ({ "a.ts": 50, "b.ts": 3 })[file] ?? 9, 20);
  assert.deepEqual(top, [
    { file: "a.ts", commits: 2, complexity: 50, score: 100 },
    { file: "b.ts", commits: 10, complexity: 3, score: 30 },
  ]);
});

test("rankHotspots leaves out a file with zero complexity", () => {
  assert.deepEqual(rankHotspots({ "a.ts": 5 }, ["a.ts"], () => 0, 20), []);
});
