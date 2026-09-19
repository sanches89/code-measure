import { readFileSync } from "node:fs";
import { percent } from "../coverage/index.mjs";
import { createResolver } from "../coverage/resolve.mjs";
import { notRequested } from "../tests.mjs";
import { readReport } from "./formats.mjs";

// Most detected first. A mutant that two reports name keeps the status that comes first.
const STATUSES = ["killed", "timeout", "survived", "noCoverage", "invalid", "ignored"];

const countStatuses = (mutants) => {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const mutant of mutants) counts[mutant.status]++;
  return counts;
};

// Invalid and ignored mutants never reached a test verdict, so they stay out of the total and the score.
const tested = (counts) => counts.killed + counts.timeout + counts.survived + counts.noCoverage;
const score = (counts) => percent(counts.killed + counts.timeout, tested(counts));
const byText = (x, y) => (x < y ? -1 : x > y ? 1 : 0);

/** The name of the innermost function around `line`: the one that starts last, then ends first. */
export const functionAt = (functions, line) => {
  let found = null;
  for (const fn of functions) {
    if (line === null || line < fn.line || line > fn.end) continue;
    if (!found || fn.line > found.line || (fn.line === found.line && fn.end < found.end)) found = fn;
  }
  return found?.function ?? null;
};

/** Resolve each mutant to a measured file, and merge the reports: a mutant that several reports name counts once. */
const mergeReports = (reports, resolve) => {
  const merged = new Map();
  const names = new Set();
  for (const { mutants, sources } of reports) {
    const fileOf = new Map();
    const seen = new Map();
    for (const mutant of mutants) {
      if (!mutant.name) continue;
      names.add(mutant.name);
      if (!fileOf.has(mutant.name)) fileOf.set(mutant.name, resolve(mutant.name, sources));
      const file = fileOf.get(mutant.name);
      if (!file) continue;
      // One report can hold look-alike mutants, such as two negated conditions on one line: number them so that only a twin of another report merges.
      const key = [file, mutant.line, mutant.mutator, mutant.change].join("\0");
      const nth = (seen.get(key) ?? 0) + 1;
      seen.set(key, nth);
      const id = `${key}\0${nth}`;
      const old = merged.get(id);
      if (!old || STATUSES.indexOf(mutant.status) < STATUSES.indexOf(old.status)) merged.set(id, { ...mutant, file });
    }
  }
  return { mutants: [...merged.values()], names };
};

/** The mutation part of the summary, from parsed reports. `resolve` maps a report path to a measured file or null. */
export const summarizeMutation = ({ reports, functions, resolve, top }) => {
  const format = [...new Set(reports.map((r) => r.format))].join(",");
  const { mutants, names } = mergeReports(reports, resolve);
  if (!mutants.length) return { status: "failed", format, reason: `none of the ${names.size} file(s) in the mutation report is a file under the paths. Run from the project root, and pass a report of the code under the paths.` };

  const perFile = new Map();
  for (const mutant of mutants) {
    if (!perFile.has(mutant.file)) perFile.set(mutant.file, []);
    perFile.get(mutant.file).push(mutant);
  }
  const fileStats = [...perFile].map(([file, list]) => ({ file, ...countStatuses(list) }));
  const survivedIn = new Map(fileStats.map((f) => [f.file, f.survived]));
  const functionsIn = new Map();
  for (const fn of functions ?? []) {
    if (!functionsIn.has(fn.file)) functionsIn.set(fn.file, []);
    functionsIn.get(fn.file).push(fn);
  }

  const counts = countStatuses(mutants);
  counts.ignored += reports.reduce((sum, r) => sum + r.skipped, 0);
  const lineOrder = (mutant) => mutant.line ?? Number.MAX_SAFE_INTEGER;
  return {
    status: "ok",
    format,
    files: perFile.size,
    mutants: tested(counts),
    ...counts,
    score: score(counts),
    top: fileStats
      .filter((f) => f.survived + f.noCoverage > 0)
      .sort((x, y) => y.survived - x.survived || y.noCoverage - x.noCoverage || byText(x.file, y.file))
      .slice(0, top)
      .map((f) => ({ file: f.file, mutants: tested(f), survived: f.survived, noCoverage: f.noCoverage, score: score(f) })),
    survivors: mutants
      .filter((m) => m.status === "survived")
      .sort((x, y) => survivedIn.get(y.file) - survivedIn.get(x.file) || byText(x.file, y.file) || lineOrder(x) - lineOrder(y))
      .slice(0, top)
      .map((m) => ({ file: m.file, line: m.line, function: functionAt(functionsIn.get(m.file) ?? [], m.line) ?? m.function, mutator: m.mutator, change: m.change })),
  };
};

export const measureMutation = ({ mutationReports, codeFiles, functions, everyFile, settings }) => {
  if (!mutationReports.length) return notRequested("--mutation-report");
  const reports = [];
  for (const path of mutationReports) {
    let report;
    try {
      report = readReport(readFileSync(path, "utf8"));
    } catch (error) {
      return { status: "failed", reason: `${path} ${error.message}` };
    }
    if (!report) return { status: "failed", reason: `${path} is not a Stryker mutation-testing-report JSON, a PIT mutations.xml, a cargo-mutants outcomes.json, or an Infection JSON log.` };
    reports.push(report);
  }
  const resolve = createResolver(new Set(codeFiles), everyFile);
  return summarizeMutation({ reports, functions, resolve, top: settings.top });
};
