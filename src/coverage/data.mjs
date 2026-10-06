// Coverage data of one or more reports: report path -> { lines: Map<line, hits>, branches: Map<key, { line, covered, total }> }.
// The same line or branch seen twice keeps its highest value.

export const entryFor = (data, name) => {
  if (!data.has(name)) data.set(name, { lines: new Map(), branches: new Map() });
  return data.get(name);
};

export const addLine = (entry, line, hits) => entry.lines.set(line, Math.max(entry.lines.get(line) ?? 0, hits));

export const addBranch = (entry, key, line, covered, total) => {
  const old = entry.branches.get(key);
  entry.branches.set(key, { line, covered: Math.max(old?.covered ?? 0, covered), total: Math.max(old?.total ?? 0, total) });
};

/** Covered and total lines and branches of an entry, counting only the lines `keep` accepts. */
export const tally = (entry, keep = () => true) => {
  const lines = { covered: 0, total: 0 };
  const branches = { covered: 0, total: 0 };
  for (const [line, hits] of entry.lines) {
    if (!keep(line)) continue;
    lines.total++;
    if (hits > 0) lines.covered++;
  }
  for (const branch of entry.branches.values()) {
    if (!keep(branch.line)) continue;
    branches.total += branch.total;
    branches.covered += branch.covered;
  }
  return { lines, branches };
};
