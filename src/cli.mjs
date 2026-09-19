import { readFileSync } from "node:fs";
import { parseArgs, UsageError } from "./args.mjs";
import { compare } from "./compare.mjs";
import { measureComplexity } from "./complexity.mjs";
import { measureCoverage } from "./coverage/index.mjs";
import { measureDuplication } from "./duplication.mjs";
import { insideGit, isCode, listFiles, rel } from "./files.mjs";
import { HELP } from "./help.mjs";
import { measureHotspots } from "./hotspots.mjs";
import { measureMutation } from "./mutation/index.mjs";
import { measureTests } from "./tests.mjs";

const VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const SKIPPED = { status: "skipped", reason: "named in --skip" };

/** Measure everything the options ask for. Returns the summary. */
export const measure = ({ settings, paths, skip, testReports, coverageReports, mutationReports, before }) => {
  const inGit = insideGit();
  const files = listFiles(paths, settings.ignore, inGit);
  const codeFiles = files.filter(isCode);
  const summary = { version: 1, tool: `code-measure ${VERSION}`, paths: paths.map(rel), settings, files: files.length };

  summary.duplication = skip.includes("duplication") ? SKIPPED : measureDuplication(paths, settings);
  const { perFile, all, ...complexity } = skip.includes("complexity") ? SKIPPED : measureComplexity(codeFiles, settings);
  summary.complexity = complexity;
  summary.hotspots = skip.includes("hotspots") ? SKIPPED : measureHotspots({ paths, codeFiles, perFile: perFile ?? null, settings, inGit });
  summary.tests = measureTests(testReports, settings);
  const everyFile = () => listFiles(["."], [], inGit);
  summary.coverage = measureCoverage({ coverageReports, codeFiles, functions: all ?? null, everyFile, settings });
  summary.mutation = measureMutation({ mutationReports, codeFiles, functions: all ?? null, everyFile, settings });

  if (before) Object.assign(summary, compare(before, summary));
  return summary;
};

export const main = (argv) => {
  if (argv.includes("--help") || argv.includes("-h")) return void process.stdout.write(HELP);
  if (argv.includes("--version") || argv.includes("-V")) return void process.stdout.write(`${VERSION}\n`);
  try {
    const summary = measure(parseArgs(argv));
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    process.exitCode = summary.worse?.length ? 3 : 0;
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`Error: ${error.message}\n`);
      process.exitCode = 2;
    } else {
      process.stderr.write(`Error: unexpected failure: ${error.stack || error.message}\n`);
      process.exitCode = 1;
    }
  }
};
