#!/usr/bin/env node
// The mechanical half of the agent-docs audit: sizes against a base ref, and
// the checks a script can decide for the AGENTS.md files and docs/refs.
//
//   node <skill-dir>/scripts/audit.mjs [--base <ref>] [--fix]
//   (from the audited repo; <skill-dir> is the folder holding SKILL.md)
//
// Run with --help for the flags and exit codes.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

const HELP = `Usage: node <skill-dir>/scripts/audit.mjs [--base <ref>] [--fix]

Audit the AGENTS.md files and docs/refs of the git repository that contains
the current directory. Prints word counts against a base ref and reports the
checks a script can decide: a missing CLAUDE.md pair, a pointer to a parent
file, a refs folder no AGENTS.md indexes, a README that misses a file, a
missing "Reference:" footer, a broken relative link or heading, a cited
docs/refs path that is gone, inline URLs, and padded tables.

Options:
  --base <ref>  Git ref the word counts are compared to (default: HEAD)
  --fix         Rewrite docs/refs files: drop inline URLs whose link text
                already names the target, and remove table alignment padding.
                Every other finding is only reported.
  -h, --help    Print this help and exit

Exit codes:
  0  no errors (notes, such as files over 1000 words, never fail the run)
  1  at least one error remains
  2  invalid arguments

Examples:
  node <skill-dir>/scripts/audit.mjs
  node <skill-dir>/scripts/audit.mjs --base v1.2.0
  node <skill-dir>/scripts/audit.mjs --fix
`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
const unknown = args.filter((a, i) => a.startsWith("-") && !["--base", "--fix"].includes(a) && !(args[i - 1] === "--base"));
if (unknown.length || (args.includes("--base") && !args[args.indexOf("--base") + 1])) {
  const why = unknown.length ? `unknown option ${unknown.join(", ")}` : "--base needs a ref";
  process.stderr.write(`Error: ${why}. Options: --base <ref>, --fix, --help.\n`);
  process.exit(2);
}
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "HEAD";
const fix = args.includes("--fix");

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const root = git("rev-parse", "--show-toplevel").trim();
process.chdir(root);

const files = git("ls-files", "-co", "--exclude-standard").split("\n").filter((f) => f && existsSync(f));
const atBase = (path) => {
  try {
    return git("show", `${base}:${path}`);
  } catch {
    return null;
  }
};
const words = (s) => (s.match(/\S+/g) ?? []).length;

const errors = [];
const notes = [];

// ---------------------------------------------------------------- markdown

const FOOTER = "\n---\n\nReference:";

/** Splits text into prose and fenced-code chunks, so code is never touched. */
function chunks(text) {
  const out = [];
  let buf = [];
  let code = false;
  for (const line of text.split(/(?<=\n)/)) {
    if (line.trimStart().startsWith("```")) {
      if (!code) {
        out.push({ code: false, text: buf.join("") });
        buf = [line];
      } else {
        buf.push(line);
        out.push({ code: true, text: buf.join("") });
        buf = [];
      }
      code = !code;
      continue;
    }
    buf.push(line);
  }
  out.push({ code, text: buf.join("") });
  return out;
}

const prose = (text) =>
  chunks(text)
    .filter((c) => !c.code)
    .map((c) => c.text)
    .join("");

/** Text that says nothing about where it points keeps its URL. */
const GENERIC = /^(this|that|the) (article|page|guide|section|post)$|^here$/i;

/** Every inline link: [label](url), label brackets and url parens balanced. */
function links(text) {
  const found = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "[") continue;
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      if (text[j] === "[") depth++;
      else if (text[j] === "]" && --depth === 0) break;
      else if (text[j] === "\n" && text[j + 1] === "\n") break;
    }
    if (depth !== 0 || text[j + 1] !== "(") continue;
    let k = j + 1;
    let parens = 0;
    for (; k < text.length; k++) {
      if (text[k] === "(") parens++;
      else if (text[k] === ")" && --parens === 0) break;
      else if (/\s/.test(text[k])) break;
    }
    if (parens !== 0) continue;
    found.push({ start: i, end: k + 1, label: text.slice(i + 1, j), url: text.slice(j + 2, k) });
    i = k;
  }
  return found;
}

const outward = (url) => /^(https?:|\/|#)/.test(url);
const strippable = (link) => outward(link.url) && !GENERIC.test(link.label);

function stripLinks(text) {
  let out = "";
  let at = 0;
  for (const link of links(text)) {
    out += text.slice(at, link.start);
    if (!strippable(link)) out += text.slice(link.start, link.end);
    else if (link.label === "More info.") out = out.replace(/ +$/, "");
    else out += stripLinks(link.label);
    at = link.end;
  }
  return out + text.slice(at);
}

function cells(row) {
  const out = [];
  let cur = "";
  let tick = false;
  for (const ch of row.trim().slice(1, -1)) {
    if (ch === "`") tick = !tick;
    if (ch === "|" && !tick) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const isRow = (line) => /^\s*\|.*\|\s*$/.test(line);

function unpadTable(line) {
  if (!isRow(line)) return line;
  const indent = line.match(/^\s*/)[0];
  let row = cells(line);
  if (row.every((c) => /^:?-+:?$/.test(c))) {
    row = row.map((c) => `${c.startsWith(":") ? ":" : ""}---${c.length > 1 && c.endsWith(":") ? ":" : ""}`);
  }
  return `${indent}| ${row.join(" | ")} |`;
}

function tidy(text) {
  const at = text.lastIndexOf(FOOTER);
  const head = at < 0 ? text : text.slice(0, at);
  const foot = at < 0 ? "" : text.slice(at);
  const body = chunks(head)
    .map((c) => (c.code ? c.text : stripLinks(c.text).split("\n").map(unpadTable).join("\n")))
    .join("");
  return body + foot;
}

const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");

function anchors(path) {
  return new Set(
    prose(readFileSync(path, "utf8"))
      .split("\n")
      .filter((l) => /^#+ /.test(l))
      .map((l) => slug(l.replace(/^#+ /, ""))),
  );
}

/** Relative links in a Markdown file resolve to a file, and to a heading when they name one. */
function checkRelativeLinks(path) {
  for (const link of links(prose(readFileSync(path, "utf8")))) {
    if (outward(link.url) || /^[a-z]+:/.test(link.url)) continue;
    const [target, anchor] = link.url.split("#");
    const file = normalize(join(dirname(path), target));
    if (!existsSync(file)) {
      errors.push(`${path}: link to missing ${link.url}`);
    } else if (anchor && statSync(file).isFile() && !anchors(file).has(anchor)) {
      errors.push(`${path}: link to missing heading ${link.url}`);
    }
  }
}

// ---------------------------------------------------------------- AGENTS.md

const agentsFiles = files.filter((f) => f === "AGENTS.md" || f.endsWith("/AGENTS.md")).sort();
const table = [];

for (const path of agentsFiles) {
  const text = readFileSync(path, "utf8");
  const before = atBase(path);
  table.push([path, before === null ? "new" : words(before), words(text)]);

  const claude = join(dirname(path), "CLAUDE.md");
  if (!existsSync(claude)) errors.push(`${path}: no CLAUDE.md beside it`);
  else if (readFileSync(claude, "utf8").trim() !== "@AGENTS.md") {
    errors.push(`${claude}: should read exactly @AGENTS.md`);
  }

  // A scoped file never points back at a file that is loaded with it. A bare
  // `AGENTS.md` names no folder, so only a path or "root AGENTS.md" counts.
  const dir = dirname(path);
  if (dir !== ".") {
    const ancestors = [];
    for (let d = dirname(dir); d !== "."; d = dirname(d)) ancestors.push(`${d}/AGENTS.md`, `${d}/CLAUDE.md`);
    for (const [n, line] of text.split("\n").entries()) {
      const mentioned = [...line.matchAll(/([\w.-]+(?:\/[\w.-]+)*\/(?:AGENTS|CLAUDE)\.md)/g)].map((m) => m[1]);
      if (/root `?AGENTS\.md/i.test(line) || mentioned.some((m) => ancestors.includes(m))) {
        errors.push(`${path}:${n + 1}: points at a parent file, which is already loaded`);
      }
    }
  }
  checkRelativeLinks(path);
}

for (const path of files.filter((f) => f === "CLAUDE.md" || f.endsWith("/CLAUDE.md"))) {
  if (!existsSync(join(dirname(path), "AGENTS.md"))) errors.push(`${path}: no AGENTS.md beside it`);
}

// ---------------------------------------------------------------- docs/refs

const refFiles = files.filter((f) => f.startsWith("docs/refs/") && f.endsWith(".md"));
const folders = [...new Set(refFiles.map((f) => f.split("/")[2]))].sort();
const agentsText = agentsFiles.map((f) => readFileSync(f, "utf8")).join("\n");
const refTable = [];

if (fix) {
  for (const path of refFiles) {
    const text = readFileSync(path, "utf8");
    const tidied = tidy(text);
    if (tidied !== text) {
      writeFileSync(path, tidied);
      notes.push(`fixed ${path}`);
    }
  }
}

for (const folder of folders) {
  const dir = `docs/refs/${folder}`;
  const inFolder = refFiles.filter((f) => f.startsWith(`${dir}/`));
  const baseFiles = (() => {
    try {
      return git("ls-tree", "-r", "--name-only", base, dir).split("\n").filter(Boolean);
    } catch {
      return [];
    }
  })();
  const baseWords = baseFiles.reduce((n, f) => n + words(atBase(f) ?? ""), 0);
  const nowWords = inFolder.reduce((n, f) => n + words(readFileSync(f, "utf8")), 0);
  refTable.push([dir, baseFiles.length ? `${baseFiles.length} files, ${baseWords}` : "new", `${inFolder.length} files, ${nowWords}`]);

  if (!agentsText.includes(`${dir}/`)) errors.push(`${dir}/: no AGENTS.md indexes it`);

  const readme = `${dir}/README.md`;
  if (!existsSync(readme)) {
    errors.push(`${dir}/: no README.md index`);
  } else {
    const listed = new Set(links(readFileSync(readme, "utf8")).map((l) => l.url.split("#")[0]));
    for (const f of inFolder) {
      const name = relative(dir, f);
      if (name !== "README.md" && !listed.has(name)) errors.push(`${readme}: does not list ${name}`);
    }
  }

  for (const path of inFolder) {
    const text = readFileSync(path, "utf8");
    if (!text.includes(FOOTER)) errors.push(`${path}: no "Reference:" footer with the origin URL`);
    const head = text.includes(FOOTER) ? text.slice(0, text.lastIndexOf(FOOTER)) : text;
    const urls = links(prose(head)).filter(strippable).length;
    if (urls > 0) errors.push(`${path}: ${urls} inline URL(s) the link text already names (--fix)`);
    const padded = prose(head)
      .split("\n")
      .filter((l) => isRow(l) && (/\S {2,}\|| \|\s{2,}\S|-{4,}/.test(l)))
      .length;
    if (padded > 0) errors.push(`${path}: ${padded} padded table row(s) (--fix)`);
    const n = words(text);
    if (path !== readme && n > 1000) notes.push(`${path}: ${n} words; check every section is one the repo uses`);
    checkRelativeLinks(path);
  }
}

// Every docs/refs path the repo cites still exists.
const grepCited = () => {
  try {
    return git("grep", "-I", "-o", "-h", "-E", "docs/refs/[A-Za-z0-9._/*-]+", "--", ".", ":!docs/refs");
  } catch (e) {
    if (e.status === 1) return ""; // git grep exits 1 when nothing matches
    throw e;
  }
};
const cited = grepCited()
  .split("\n")
  .filter(Boolean)
  .map((p) => p.replace(/[.,:;)`'"]+$/, ""));
for (const path of new Set(cited)) {
  if (path.includes("*")) continue;
  if (!existsSync(path)) errors.push(`cited but missing: ${path}`);
}

// ---------------------------------------------------------------- report

const print = (title, rows) => {
  console.log(`\n${title}`);
  const width = Math.max(...rows.map((r) => r[0].length));
  for (const [name, was, now] of rows) console.log(`  ${name.padEnd(width)}  ${String(was).padStart(16)} -> ${now}`);
};

print(`AGENTS.md words (base ${base} -> now)`, table);
print(`docs/refs words (base ${base} -> now)`, refTable);
if (notes.length) console.log(`\nNotes\n${notes.map((n) => `  ${n}`).join("\n")}`);
console.log(errors.length ? `\nErrors\n${errors.map((e) => `  ${e}`).join("\n")}` : "\nNo errors.");
process.exit(errors.length ? 1 : 0);
