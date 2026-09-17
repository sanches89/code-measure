import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { rel } from "./files.mjs";
import { firstLine, run } from "./run.mjs";

const countLines = (file) => {
  try {
    if (statSync(file).size > 1024 * 1024) return 0;
    const text = readFileSync(file, "utf8");
    if (text.includes("\0")) return 0;
    return text.split("\n").filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
};

/** Rank files by commits multiplied by complexity. `complexityOf` maps a file to a number. */
export const rankHotspots = (commits, pool, complexityOf, top) =>
  pool
    .filter((file) => commits[file])
    .map((file) => ({ file, commits: commits[file], complexity: complexityOf(file) }))
    .map((h) => ({ ...h, score: h.commits * h.complexity }))
    .filter((h) => h.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, top);

export const measureHotspots = ({ paths, codeFiles, perFile, settings, inGit }) => {
  if (!inGit) return { status: "skipped", reason: "not inside a git repository" };
  if (run("git", ["rev-parse", "--verify", "--quiet", "HEAD"]).status !== 0) return { status: "skipped", reason: "the git repository has no commit yet" };
  const log = run("git", ["log", `--since=${settings.since}`, "--format=", "--name-only", "-z", "--", ...paths]);
  if (log.status !== 0) return { status: "failed", reason: firstLine(log.stderr) || `git log exited with ${log.status}` };
  const root = run("git", ["rev-parse", "--show-toplevel"]).stdout.trim();
  const commits = {};
  for (const name of log.stdout.split(/[\0\n]/).filter(Boolean)) {
    const file = rel(join(root, name));
    commits[file] = (commits[file] ?? 0) + 1;
  }
  const pool = perFile ? Object.keys(perFile) : codeFiles;
  const complexityOf = perFile ? (file) => perFile[file] : countLines;
  return { status: "ok", since: settings.since, complexityMeasure: perFile ? "ccn" : "lines", top: rankHotspots(commits, pool, complexityOf, settings.top) };
};
