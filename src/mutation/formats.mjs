import { oneLine } from "../tests.mjs";
import { collect, parseXml } from "../xml.mjs";

// The status of each tool, as a bucket of the summary. A status missing here counts as ignored.
const STRYKER = { Killed: "killed", Survived: "survived", Timeout: "timeout", NoCoverage: "noCoverage", CompileError: "invalid", RuntimeError: "invalid", Ignored: "ignored", Pending: "ignored" };
const PIT = { KILLED: "killed", SURVIVED: "survived", TIMED_OUT: "timeout", MEMORY_ERROR: "timeout", NO_COVERAGE: "noCoverage", NON_VIABLE: "invalid", RUN_ERROR: "invalid", EQUIVALENT: "ignored", NOT_STARTED: "ignored", STARTED: "ignored" };
const CARGO_MUTANTS = { CaughtMutant: "killed", MissedMutant: "survived", Timeout: "timeout", Unviable: "invalid", Failure: "invalid" };
// Infection has no status per mutant: it lists the mutants of each outcome under its own key.
const INFECTION = { killed: "killed", killedByStaticAnalysis: "killed", escaped: "survived", timeouted: "timeout", uncovered: "noCoverage", errored: "invalid", syntaxErrors: "invalid", ignored: "ignored" };

// Reports can change shape between tool versions, so every value is checked before use.
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const nameOf = (value) => (typeof value === "string" && value ? value : null);
const short = (value) => (typeof value === "string" && oneLine(value)) || null;
const lineOf = (value) => {
  const line = Number(value);
  return Number.isInteger(line) && line >= 1 ? line : null;
};
const bucket = (statuses, status) => (typeof status === "string" && Object.hasOwn(statuses, status) ? statuses[status] : "ignored");
const report = (format, mutants, sources = [], skipped = 0) => ({ format, mutants, sources, skipped });

/** Stryker's mutation-testing-report-schema JSON: files, keyed by path, each with its mutants. */
export const parseStryker = (json) => {
  const mutants = [];
  for (const [name, file] of Object.entries(json.files)) {
    for (const mutant of arrayOf(file?.mutants).filter(isObject)) {
      mutants.push({
        name,
        line: lineOf(mutant.location?.start?.line),
        function: null,
        mutator: short(mutant.mutatorName),
        change: short(mutant.replacement) ?? short(mutant.description),
        status: bucket(STRYKER, mutant.status),
      });
    }
  }
  return report("stryker", mutants, nameOf(json.projectRoot) ? [json.projectRoot] : []);
};

const textOf = (node) => String((isObject(node) ? node["#text"] : node) ?? "").trim();

/** PIT's mutations.xml. It names a file by the package of the class and a bare source file name. */
export const parsePit = (root) => {
  const mutants = collect(root.mutations, "mutation").filter(isObject).map((mutation) => {
    const className = textOf(mutation.mutatedClass);
    const sourceFile = textOf(mutation.sourceFile);
    const folders = className.includes(".") ? className.slice(0, className.lastIndexOf(".")).replaceAll(".", "/") : "";
    const mutator = textOf(mutation.mutator);
    return {
      name: sourceFile ? [folders, sourceFile].filter(Boolean).join("/") : null,
      line: lineOf(textOf(mutation.lineNumber)),
      function: short(textOf(mutation.mutatedMethod)),
      mutator: short(mutator.slice(mutator.lastIndexOf(".") + 1)),
      change: short(textOf(mutation.description)),
      status: bucket(PIT, mutation["@_status"]),
    };
  });
  return report("pit", mutants);
};

/** cargo-mutants' outcomes.json. The baseline outcome is no mutant. */
export const parseCargoMutants = (json) => {
  const mutants = json.outcomes
    .filter((outcome) => isObject(outcome?.scenario?.Mutant))
    .map(({ scenario: { Mutant: mutant }, summary }) => ({
      name: nameOf(mutant.file),
      line: lineOf(mutant.span?.start?.line),
      function: short(mutant.function?.function_name),
      mutator: short(mutant.genre),
      change: short(mutant.replacement),
      status: bucket(CARGO_MUTANTS, summary),
    }));
  return report("cargo-mutants", mutants);
};

/** The first line that a unified diff adds, without its "+". Lines before the first "@@" are the header. */
const firstAddedLine = (diff) => {
  if (typeof diff !== "string") return null;
  const lines = diff.split("\n");
  const hunk = lines.findIndex((line) => line.startsWith("@@"));
  if (hunk < 0) return null;
  const added = lines.slice(hunk + 1).find((line) => line.startsWith("+"));
  return added === undefined ? null : short(added.slice(1));
};

/** Infection's JSON log. Its skipped mutants exist only as a count. */
export const parseInfection = (json) => {
  const mutants = Object.entries(INFECTION).flatMap(([key, status]) =>
    arrayOf(json[key]).filter(isObject).map((entry) => ({
      name: nameOf(entry.mutator?.originalFilePath),
      line: lineOf(entry.mutator?.originalStartLine),
      function: null,
      mutator: short(entry.mutator?.mutatorName),
      change: firstAddedLine(entry.diff),
      status,
    })),
  );
  const skipped = json.stats.skippedCount;
  return report("infection", mutants, [], Number.isInteger(skipped) && skipped > 0 ? skipped : 0);
};

const parseAs = (syntax, parse, text) => {
  try {
    return parse(text);
  } catch (error) {
    throw new Error(`is not valid ${syntax}: ${error.message}`);
  }
};

/**
 * Read one report text, of any format, as { format, mutants, sources, skipped }, or null when the format is unknown.
 * Each mutant is { name, line, function, mutator, change, status }, with `name` the path the report gives.
 * Throws for invalid JSON or XML, with the parser message.
 */
export const readReport = (text) => {
  const body = text.replace(/^﻿/, "");
  if (body.trimStart().startsWith("{")) {
    const json = parseAs("JSON", JSON.parse, body);
    if (typeof json.schemaVersion === "string" && isObject(json.files)) return parseStryker(json);
    if (Array.isArray(json.outcomes) && typeof json.cargo_mutants_version === "string") return parseCargoMutants(json);
    if (isObject(json.stats) && Array.isArray(json.killed) && Array.isArray(json.escaped)) return parseInfection(json);
    return null;
  }
  if (/<mutations[\s>/]/.test(body.slice(0, 4000))) {
    const root = parseAs("XML", parseXml, body);
    if (root.mutations !== undefined) return parsePit(root);
  }
  return null;
};
