// The values that --compare checks. A value is worse when it rises. "falls" marks the ones that are worse when they fall.
// Sums and percentages stay out on purpose: README.md, "What `--compare` checks", says why.
const PAIRS = [
  ["duplication.duplicatedLines", (s) => s.duplication?.duplicatedLines, "duplication"],
  ["duplication.clones", (s) => s.duplication?.clones, "duplication"],
  ["complexity.overLimit.ccn", (s) => s.complexity?.overLimit?.ccn, "complexity"],
  ["complexity.overLimit.length", (s) => s.complexity?.overLimit?.length, "complexity"],
  ["complexity.overLimit.params", (s) => s.complexity?.overLimit?.params, "complexity"],
  ["complexity.maxCcn", (s) => s.complexity?.maxCcn, "complexity"],
  ["tests.total", (s) => s.tests?.total, "tests", "falls"],
  ["tests.failed", (s) => s.tests?.failed, "tests"],
  ["tests.skipped", (s) => s.tests?.skipped, "tests"],
  ["coverage.lines.uncovered", (s) => s.coverage?.lines?.uncovered, "coverage"],
  ["coverage.branches.uncovered", (s) => s.coverage?.branches?.uncovered, "coverage"],
  ["mutation.survived", (s) => s.mutation?.survived, "mutation"],
  ["mutation.noCoverage", (s) => s.mutation?.noCoverage, "mutation"],
];

/** Compare two summaries. Returns { delta, worse, notCompared }. */
export const compare = (before, after) => {
  const delta = {};
  const worse = [];
  const notCompared = [];
  for (const [name, pick, part, direction] of PAIRS) {
    const unasked = (summary) => !summary[part] || summary[part].notRequested;
    if (unasked(before) && unasked(after)) continue;
    if (before[part]?.status !== "ok" || after[part]?.status !== "ok") {
      if (!notCompared.includes(part)) notCompared.push(part);
      continue;
    }
    const was = pick(before);
    const now = pick(after);
    if (typeof was !== "number" || typeof now !== "number") continue;
    delta[name] = { before: was, after: now };
    if (direction === "falls" ? now < was : now > was) worse.push(name);
  }
  return { delta, worse, notCompared };
};
