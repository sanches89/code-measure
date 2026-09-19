import { existsSync, readFileSync } from "node:fs";

export const MEASUREMENTS = ["duplication", "complexity", "hotspots"];
const VALUE_OPTIONS = ["--compare", "--test-report", "--coverage-report", "--mutation-report", "--ignore", "--skip", "--top", "--min-tokens", "--min-lines", "--ccn", "--length", "--params", "--since"];
const NUMBER_OPTIONS = { "--top": "top", "--min-tokens": "minTokens", "--min-lines": "minLines", "--ccn": "ccn", "--length": "length", "--params": "params" };
const FIXED_BY_COMPARE = ["--min-tokens", "--min-lines", "--ccn", "--length", "--params", "--ignore"];

export const DEFAULTS = { top: 20, minTokens: 50, minLines: 5, ccn: 10, length: 50, params: 4, since: "12 months ago", ignore: [] };

/** An invalid command line. The CLI prints the message and exits 2. */
export class UsageError extends Error {}

const list = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);

const readNumber = (arg, value) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new UsageError(`${arg} needs a whole number of 1 or more, got "${value}".`);
  return number;
};

const readSkip = (value) => {
  const skip = list(value);
  const bad = skip.filter((name) => !MEASUREMENTS.includes(name));
  if (bad.length) throw new UsageError(`--skip got ${bad.join(", ")}. Expected a comma-separated list of: ${MEASUREMENTS.join(", ")}.`);
  return skip;
};

// One handler per option that is not a number. Each one stores its value in the result.
const HANDLERS = {
  "--compare": (result, value) => (result.compareFile = value),
  "--test-report": (result, value) => result.testReports.push(value),
  "--coverage-report": (result, value) => result.coverageReports.push(value),
  "--mutation-report": (result, value) => result.mutationReports.push(value),
  "--since": (result, value) => (result.settings.since = value),
  "--ignore": (result, value) => (result.settings.ignore = list(value)),
  "--skip": (result, value) => (result.skip = readSkip(value)),
};

/** Read every option and path of the command line. `given` collects the names of the options seen. */
const readOptions = (argv, given) => {
  const result = { settings: { ...DEFAULTS }, paths: [], skip: [], testReports: [], coverageReports: [], mutationReports: [], before: null, compareFile: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("-")) {
      result.paths.push(arg);
      continue;
    }
    if (!VALUE_OPTIONS.includes(arg)) throw new UsageError(`unknown option ${arg}. Options: ${VALUE_OPTIONS.join(", ")}, --version, --help.`);
    const value = argv[++i];
    if (value === undefined || value === "") throw new UsageError(`${arg} needs a value. Run with --help for the expected form.`);
    given.add(arg);
    if (HANDLERS[arg]) HANDLERS[arg](result, value);
    else result.settings[NUMBER_OPTIONS[arg]] = readNumber(arg, value);
  }
  return result;
};

/** Load the summary of --compare and take its limits, and its paths when the command line names none. */
const applyBefore = (result, given) => {
  const { compareFile, settings } = result;
  let before;
  try {
    before = JSON.parse(readFileSync(compareFile, "utf8"));
  } catch (error) {
    throw new UsageError(`cannot read --compare file ${compareFile}: ${error.message}. Expected a summary saved from an earlier run.`);
  }
  if (!before || before.version !== 1 || !before.settings) throw new UsageError(`${compareFile} is not a summary of this tool. Save one first: code-measure <path>... > <file>.`);
  const fixed = FIXED_BY_COMPARE.filter((option) => given.has(option));
  if (fixed.length) throw new UsageError(`${fixed.join(", ")} cannot be combined with --compare, which reuses the limits of ${compareFile}.`);
  for (const key of ["minTokens", "minLines", "ccn", "length", "params", "ignore"]) settings[key] = before.settings[key];
  if (!given.has("--since")) settings.since = before.settings.since;
  if (!result.paths.length) result.paths = before.paths;
  result.before = before;
};

const checkExists = ({ paths, testReports, coverageReports, mutationReports }) => {
  const missing = paths.filter((path) => !existsSync(path));
  if (missing.length) throw new UsageError(`path not found: ${missing.join(", ")}. Give paths relative to the current directory.`);
  const missingReports = [...testReports, ...coverageReports, ...mutationReports].filter((path) => !existsSync(path));
  if (missingReports.length) throw new UsageError(`report not found: ${missingReports.join(", ")}. Run the project's test command first and pass the report file it wrote.`);
};

/** Parse the command line into { settings, paths, skip, testReports, coverageReports, mutationReports, before }. */
export const parseArgs = (argv) => {
  const given = new Set();
  const { compareFile, ...result } = readOptions(argv, given);
  if (compareFile) applyBefore(Object.assign(result, { compareFile }), given);
  delete result.compareFile;
  if (!result.paths.length) result.paths = ["."];
  checkExists(result);
  return result;
};
