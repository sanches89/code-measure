#!/usr/bin/env node
// Rewrite the range of one dependency in one package.json and keep every
// other byte of the file. See HELP for the options and the exit codes.

import { readFileSync, writeFileSync } from "node:fs";

const SEARCHED = ["dependencies", "devDependencies", "optionalDependencies"];
const ALLOWED = [...SEARCHED, "peerDependencies"];

const HELP = `Usage: node set-range.mjs <manifest> <name> <range> [options]

Rewrites the range of one dependency in one package.json and keeps every
other byte of the file: indentation, key order, and line endings stay.
Searches dependencies, devDependencies, and optionalDependencies. Prints one
JSON line on stdout with the manifest, the section, the name, the old range,
and the new range. Diagnostics go to stderr.

Options:
  --section <s>  The section to edit: dependencies, devDependencies,
                 optionalDependencies, or peerDependencies. Required when the
                 name sits in more than one searched section.
  --dry-run      Print the change and write nothing.
  --help         Print this text.

Exit codes:
  0  the range is set, or was already equal to <range>
  1  usage error
  2  the manifest cannot be read or is not valid JSON
  3  the name is in no searched section
  4  the name is in more than one section and --section is missing
  5  the entry text was not found in the file, so nothing was written

Examples:
  node set-range.mjs package.json eslint '^9.39.5'
  node set-range.mjs packages/app/package.json react '~19.2.0' --section dependencies
  node set-range.mjs package.json typescript '5.9.3' --dry-run`;

function fail(code, message) {
  process.stderr.write(`set-range: ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const positional = [];
  const options = { section: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${HELP}\n`);
      process.exit(0);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--section") {
      options.section = argv[i + 1];
      i += 1;
      if (!ALLOWED.includes(options.section)) {
        fail(1, `--section takes one of ${ALLOWED.join(", ")}`);
      }
    } else if (arg.startsWith("--")) {
      fail(1, `unknown option ${arg}; run with --help`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 3) {
    fail(1, "expected <manifest> <name> <range>; run with --help");
  }
  const [manifest, name, range] = positional;
  return { manifest, name, range, ...options };
}

// Return the [start, end) offsets of the object value of a top-level key.
function findTopLevelObject(text, key) {
  const wanted = JSON.stringify(key);
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let lastKey = null;
  let lastKeyEnd = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
        if (depth === 1) {
          lastKey = text.slice(stringStart, i + 1);
          lastKeyEnd = i + 1;
        }
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      stringStart = i;
    } else if (ch === "{" || ch === "[") {
      const isWanted =
        ch === "{" &&
        depth === 1 &&
        lastKey === wanted &&
        /^\s*:\s*$/.test(text.slice(lastKeyEnd, i));
      if (isWanted) return objectSpan(text, i);
      depth += 1;
    } else if (ch === "}" || ch === "]") {
      depth -= 1;
    }
  }
  return null;
}

// Return the [start, end) offsets of the object that opens at `start`.
function objectSpan(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return [start, i + 1];
    }
  }
  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let text;
  let data;
  try {
    text = readFileSync(args.manifest, "utf8");
  } catch (error) {
    fail(2, `cannot read ${args.manifest}: ${error.message}`);
  }
  try {
    data = JSON.parse(text);
  } catch (error) {
    fail(2, `${args.manifest} is not valid JSON: ${error.message}`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    fail(2, `${args.manifest} does not hold a JSON object`);
  }

  let section = args.section;
  if (section === null) {
    const hits = SEARCHED.filter(
      (s) => data[s] && Object.hasOwn(data[s], args.name),
    );
    if (hits.length === 0) {
      fail(3, `${args.name} is in no searched section of ${args.manifest}`);
    }
    if (hits.length > 1) {
      fail(4, `${args.name} is in ${hits.join(" and ")}; pass --section`);
    }
    [section] = hits;
  } else if (!data[section] || !Object.hasOwn(data[section], args.name)) {
    fail(3, `${args.name} is not in ${section} of ${args.manifest}`);
  }

  const oldRange = data[section][args.name];
  const result = {
    manifest: args.manifest,
    section,
    name: args.name,
    from: oldRange,
    to: args.range,
  };
  if (oldRange === args.range) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  const span = findTopLevelObject(text, section);
  if (span === null) {
    fail(5, `cannot locate the ${section} object in ${args.manifest}`);
  }
  const [start, end] = span;
  const body = text.slice(start, end);
  const pattern = new RegExp(
    `(${escapeRegExp(JSON.stringify(args.name))}\\s*:\\s*)` +
      `${escapeRegExp(JSON.stringify(oldRange))}`,
  );
  const match = pattern.exec(body);
  if (match === null) {
    fail(5, `entry text for ${args.name} not found in ${section}`);
  }
  const replaced =
    body.slice(0, match.index) +
    match[1] +
    JSON.stringify(args.range) +
    body.slice(match.index + match[0].length);
  const output = text.slice(0, start) + replaced + text.slice(end);

  const check = JSON.parse(output);
  if (check[section][args.name] !== args.range) {
    fail(5, `rewrite of ${args.name} did not produce the expected range`);
  }
  if (!args.dryRun) {
    writeFileSync(args.manifest, output);
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main();
