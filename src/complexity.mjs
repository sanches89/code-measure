import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rel } from "./files.mjs";
import { findRunner, firstLine, run } from "./run.mjs";

const LIZARD_RUNNERS = [["lizard"], ["uvx", "lizard"], ["pipx", "run", "lizard"], ["python3", "-m", "lizard"], ["python", "-m", "lizard"]];

/** Parse CSV with quoted fields into rows of strings. Skips rows with one field. */
export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const endRow = () => {
    row.push(field);
    if (row.length > 1) rows.push(row);
    row = [];
    field = "";
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += char;
  }
  if (field || row.length) endRow();
  return rows;
};

/** Functions from lizard's CSV. Columns: nloc, ccn, tokens, params, length, location, file, function, long name, start, end. */
export const parseLizardCsv = (text) =>
  parseCsv(text)
    .filter((r) => r.length >= 11 && /^\d+$/.test(r[1]))
    .map((r) => ({ function: r[7], file: rel(r[6]), line: Number(r[9]), end: Number(r[10]), ccn: Number(r[1]), length: Number(r[4]), params: Number(r[3]) }));

/** The complexity part of the summary, plus `perFile` (summed ccn) and `all` (every function) for the other measurements. */
export const summarizeFunctions = (functions, settings) => {
  const over = (f) => f.ccn > settings.ccn || f.length > settings.length || f.params > settings.params;
  const perFile = {};
  for (const f of functions) perFile[f.file] = (perFile[f.file] ?? 0) + f.ccn;
  return {
    functions: functions.length,
    maxCcn: functions.reduce((max, f) => Math.max(max, f.ccn), 0),
    overLimit: {
      ccn: functions.filter((f) => f.ccn > settings.ccn).length,
      length: functions.filter((f) => f.length > settings.length).length,
      params: functions.filter((f) => f.params > settings.params).length,
    },
    top: functions.filter(over).sort((x, y) => y.ccn - x.ccn || y.length - x.length).slice(0, settings.top).map(({ end, ...shown }) => shown),
    perFile,
    all: functions,
  };
};

export const measureComplexity = (codeFiles, settings) => {
  const runner = findRunner(LIZARD_RUNNERS);
  if (!runner) return { status: "skipped", reason: "lizard not found. Needs lizard on PATH, or uv, or pipx, or a Python that has the lizard module." };
  const tool = `lizard ${runner.version}`;
  if (!codeFiles.length) return { status: "ok", tool, ...summarizeFunctions([], settings) };
  const dir = mkdtempSync(join(tmpdir(), "code-measure-lizard-"));
  try {
    const list = join(dir, "files.txt");
    writeFileSync(list, codeFiles.join("\n") + "\n");
    const result = run(runner.command, [...runner.args, "--csv", "-f", list]);
    if (result.error || (result.status !== 0 && !result.stdout)) return { status: "failed", tool, reason: firstLine(result.stderr) || String(result.error || `lizard exited with ${result.status}`) };
    return { status: "ok", tool, ...summarizeFunctions(parseLizardCsv(result.stdout), settings) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
