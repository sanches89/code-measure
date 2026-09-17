import { readFileSync } from "node:fs";
import { notRequested } from "../tests.mjs";
import { addBranch, addLine, entryFor } from "./data.mjs";
import { readReport } from "./formats.mjs";
import { createResolver } from "./resolve.mjs";

const percent = (covered, total) => (total ? Number(((100 * covered) / total).toFixed(2)) : null);

/** CRAP = ccn^2 * (1 - coverage)^3 + ccn, with coverage as a ratio from 0 to 1. */
export const crap = (ccn, ratio) => Number((ccn ** 2 * (1 - ratio) ** 3 + ccn).toFixed(1));

/** Coverage per function: the report lines and branches inside its line range. A file the report lacks was never loaded: 0. */
export const coverFunctions = (functions, perFile, top) => {
  const counts = { covered: 0, partly: 0, none: 0 };
  const risky = [];
  for (const fn of functions) {
    const entry = perFile.get(fn.file);
    const lines = { covered: 0, total: 0 };
    const branches = { covered: 0, total: 0 };
    if (entry) {
      for (const [line, hits] of entry.lines) {
        if (line < fn.line || line > fn.end) continue;
        lines.total++;
        if (hits > 0) lines.covered++;
      }
      for (const branch of entry.branches.values()) {
        if (branch.line < fn.line || branch.line > fn.end) continue;
        branches.total += branch.total;
        branches.covered += branch.covered;
      }
      if (!lines.total) continue; // nothing executable in the report, such as a declaration
    }
    const ratio = entry ? lines.covered / lines.total : 0;
    const full = ratio === 1 && branches.covered === branches.total;
    counts[full ? "covered" : ratio === 0 ? "none" : "partly"]++;
    if (full) continue;
    risky.push({ function: fn.function, file: fn.file, line: fn.line, ccn: fn.ccn, lines: Number((100 * ratio).toFixed(2)), branches: percent(branches.covered, branches.total), crap: crap(fn.ccn, ratio) });
  }
  return { status: "ok", ...counts, top: risky.sort((x, y) => y.crap - x.crap || y.ccn - x.ccn).slice(0, top) };
};

/** The coverage part of the summary, from parsed report data. `resolve` maps a report path to a measured file or null. */
export const summarizeCoverage = ({ data, sources, formats, codeFiles, functions, resolve, top }) => {
  const perFile = new Map();
  for (const [name, entry] of data) {
    const file = resolve(name, sources);
    if (!file) continue;
    const merged = entryFor(perFile, file);
    for (const [line, hits] of entry.lines) addLine(merged, line, hits);
    for (const [key, b] of entry.branches) addBranch(merged, key, b.line, b.covered, b.total);
  }
  const format = [...formats].join(",");
  if (!perFile.size) return { status: "failed", format, reason: `none of the ${data.size} file(s) in the report is a file under the paths. Run from the project root, and pass a report of the code under the paths.` };

  const fileStats = [...perFile].map(([file, entry]) => {
    const hits = [...entry.lines.values()];
    const branches = [...entry.branches.values()];
    return {
      file,
      linesTotal: hits.length,
      linesCovered: hits.filter((h) => h > 0).length,
      branchesTotal: branches.reduce((sum, b) => sum + b.total, 0),
      branchesCovered: branches.reduce((sum, b) => sum + b.covered, 0),
    };
  });
  const sum = (key) => fileStats.reduce((total, f) => total + f[key], 0);
  const totals = (covered, total) => ({ total, covered, uncovered: total - covered, percentage: percent(covered, total) });
  return {
    status: "ok",
    format,
    files: fileStats.length,
    lines: totals(sum("linesCovered"), sum("linesTotal")),
    branches: sum("branchesTotal") > 0 ? totals(sum("branchesCovered"), sum("branchesTotal")) : null,
    filesNotInReport: codeFiles.filter((file) => !perFile.has(file)).slice(0, top),
    top: fileStats
      .map((f) => ({ file: f.file, lines: percent(f.linesCovered, f.linesTotal), branches: percent(f.branchesCovered, f.branchesTotal), uncoveredLines: f.linesTotal - f.linesCovered, uncoveredBranches: f.branchesTotal - f.branchesCovered }))
      .filter((f) => f.uncoveredLines || f.uncoveredBranches)
      .sort((x, y) => y.uncoveredLines - x.uncoveredLines || y.uncoveredBranches - x.uncoveredBranches)
      .slice(0, top),
    functions: functions ? coverFunctions(functions, perFile, top) : { status: "skipped", reason: "needs the complexity measurement" },
  };
};

export const measureCoverage = ({ coverageReports, codeFiles, functions, everyFile, settings }) => {
  if (!coverageReports.length) return notRequested("--coverage-report");
  const data = new Map();
  const sources = [];
  const formats = new Set();
  for (const report of coverageReports) {
    let format;
    try {
      format = readReport(readFileSync(report, "utf8"), data, sources);
    } catch (error) {
      return { status: "failed", reason: `${report} is not valid XML: ${error.message}` };
    }
    if (!format) return { status: "failed", reason: `${report} is not LCOV, Cobertura XML, JaCoCo XML, or a Go cover profile.` };
    formats.add(format);
  }
  const resolve = createResolver(new Set(codeFiles), everyFile);
  return summarizeCoverage({ data, sources, formats, codeFiles, functions, resolve, top: settings.top });
};
