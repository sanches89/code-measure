// Helpers that every measurement shares to build its part of the summary.

/** The skipped part of a measurement whose option was not given. */
export const notRequested = (flag) => ({ status: "skipped", reason: `no ${flag} given`, notRequested: true });

/** Percentage of covered in total, rounded to 2 decimals, or null when total is 0. */
export const percent = (covered, total) => (total ? Number(((100 * covered) / total).toFixed(2)) : null);

/** Text on one line, trimmed and cut to 160 characters. */
export const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 160);

/** Items grouped by keyOf(item), in the order of first appearance, each group in the order of its items. */
export const groupBy = (items, keyOf) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};
