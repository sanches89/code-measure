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

const unasked = (summary, part) => !summary[part] || summary[part].notRequested;
const measured = (summary, part) => summary[part]?.status === "ok";
const isWorse = (direction, was, now) => (direction === "falls" ? now < was : now > was);

/** Compare two summaries. Returns { delta, worse, notCompared }. */
export const compare = (before, after) => {
  const delta = {};
  const worse = [];
  const notCompared = [];
  for (const [name, direction] of PAIRS) {
    const part = name.split(".")[0];
    if (unasked(before, part) && unasked(after, part)) continue;
    if (!measured(before, part) || !measured(after, part)) {
      if (!notCompared.includes(part)) notCompared.push(part);
      continue;
    }
    const was = pick(before, name);
    const now = pick(after, name);
    if (typeof was !== "number" || typeof now !== "number") continue;
    delta[name] = { before: was, after: now };
    if (isWorse(direction, was, now)) worse.push(name);
  }
  return { delta, worse, notCompared };
};
