import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { NOT_CODE, rel } from "./files.mjs";
import { findRunner, firstLine, run } from "./run.mjs";

// jscpd ships with this package. PATH and npx are the fallbacks for a broken install.
const bundledJscpd = () => {
  try {
    const require = createRequire(import.meta.url);
    const manifest = require.resolve("jscpd/package.json");
    const bin = JSON.parse(readFileSync(manifest, "utf8")).bin;
    const script = join(dirname(manifest), typeof bin === "string" ? bin : bin.jscpd);
    return existsSync(script) ? [process.execPath, script] : null;
  } catch {
    return null;
  }
};

/** Turn a jscpd JSON report into the duplication part of the summary. */
export const summarizeJscpd = (report, top) => {
  const total = report.statistics?.total ?? {};
  const side = (file) => `${rel(file.name)}:${file.start}-${file.end}`;
  const clones = (report.duplicates ?? [])
    .map((d) => ({ lines: d.lines, tokens: d.tokens, format: d.format, a: side(d.firstFile), b: side(d.secondFile) }))
    .sort((x, y) => y.lines - x.lines || y.tokens - x.tokens);
  return {
    files: total.sources ?? 0,
    lines: total.lines ?? 0,
    duplicatedLines: total.duplicatedLines ?? 0,
    percentage: Number((total.percentage ?? 0).toFixed(2)),
    clones: clones.length,
    top: clones.slice(0, top),
  };
};

export const measureDuplication = (paths, settings) => {
  const bundled = bundledJscpd();
  const runner = findRunner([...(bundled ? [bundled] : []), ["jscpd"], ["npx", "--yes", "jscpd@5"]]);
  if (!runner) return { status: "skipped", reason: "jscpd not found. Reinstall code-measure, or put jscpd on PATH." };
  const tool = runner.version.startsWith("jscpd") ? runner.version : `jscpd ${runner.version}`;
  const out = mkdtempSync(join(tmpdir(), "code-measure-jscpd-"));
  try {
    const ignore = [...settings.ignore, ...NOT_CODE.map((ext) => `**/*.${ext}`)].join(",");
    const result = run(runner.command, [
      ...runner.args, "--reporters", "json", "--output", out, "--silent", "--absolute",
      "--min-tokens", String(settings.minTokens), "--min-lines", String(settings.minLines),
      "--ignore", ignore, ...paths,
    ]);
    const reportFile = join(out, "jscpd-report.json");
    if (!existsSync(reportFile)) return { status: "failed", tool, reason: firstLine(result.stderr) || firstLine(result.stdout) || `jscpd exited with ${result.status} and wrote no report` };
    return { status: "ok", tool, ...summarizeJscpd(JSON.parse(readFileSync(reportFile, "utf8")), settings.top) };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
};
