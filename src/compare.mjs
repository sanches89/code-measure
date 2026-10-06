// The values that --compare checks. A value is worse when it rises. "falls" marks the ones that are worse when they fall.
// Sums and percentages stay out on purpose: README.md, "What `--compare` checks", says why.
const PAIRS = [
  ["duplication.duplicatedLines"],
  ["duplication.clones"],
  ["complexity.overLimit.ccn"],
  ["complexity.overLimit.length"],
  ["complexity.overLimit.params"],
  ["complexity.maxCcn"],
  ["tests.total", "falls"],
  ["tests.failed"],
  ["tests.skipped"],
  ["coverage.lines.uncovered"],
  ["coverage.branches.uncovered"],
  ["mutation.survived"],
  ["mutation.noCoverage"],
];

const pick = (summary, name) => name.split(".").reduce((value, key) => value?.[key], summary);

/** Compare two summaries. Returns { delta, worse, notCompared }. */
export const compare = (before, after) => {
  const delta = {};
  const worse = [];
  const notCompared = [];
  for (const [name, direction] of PAIRS) {
    const part = name.split(".")[0];
    const unasked = (summary) => !summary[part] || summary[part].notRequested;
    if (unasked(before) && unasked(after)) continue;
    if (before[part]?.status !== "ok" || after[part]?.status !== "ok") {
      if (!notCompared.includes(part)) notCompared.push(part);
      continue;
    }
    const was = pick(before, name);
    const now = pick(after, name);
    if (typeof was !== "number" || typeof now !== "number") continue;
    delta[name] = { before: was, after: now };
    if (direction === "falls" ? now < was : now > was) worse.push(name);
  }
  return { delta, worse, notCompared };
};
