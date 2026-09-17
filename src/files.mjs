import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { run } from "./run.mjs";

// Data and prose formats: duplication, churn, and coverage in them say nothing about code.
export const NOT_CODE = ["md", "mdx", "txt", "json", "jsonc", "yaml", "yml", "toml", "lock", "svg", "snap", "csv", "tsv", "xml", "html", "map"];
const SKIP_DIRS = new Set([".git", "node_modules", "vendor", "dist", "build", "target", ".venv", "venv", "__pycache__"]);

/** A path relative to the current directory, with forward slashes. */
export const rel = (file) => relative(process.cwd(), resolve(process.cwd(), file)).split(sep).join("/") || ".";

export const extension = (file) => {
  const base = file.slice(file.lastIndexOf("/") + 1);
  return base.includes(".") ? base.slice(base.lastIndexOf(".") + 1).toLowerCase() : "";
};

export const isCode = (file) => !NOT_CODE.includes(extension(file));

/** A glob with **, * and ? as a regular expression. A glob without a slash matches in any folder. */
export const globToRegExp = (glob) => {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*") {
      source += ".*";
      i += glob[i + 2] === "/" ? 2 : 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^(?:.*/)?${source}$`);
};

const walk = (start, out) => {
  if (statSync(start).isFile()) return void out.push(start);
  for (const entry of readdirSync(start, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(start, entry.name), out);
    } else if (entry.isFile()) out.push(join(start, entry.name));
  }
};

export const insideGit = () => run("git", ["rev-parse", "--is-inside-work-tree"]).stdout?.trim() === "true";

/** Files under the paths: from git when inside a repository, else a walk. Sorted, relative, without the ignored globs. */
export const listFiles = (paths, ignoreGlobs = [], inGit = insideGit()) => {
  let files = [];
  if (inGit) {
    const listed = run("git", ["ls-files", "-co", "--exclude-standard", "-z", "--", ...paths]);
    if (listed.status === 0) files = listed.stdout.split("\0").filter(Boolean);
  }
  if (!files.length) for (const path of paths) walk(path, files);
  const ignored = ignoreGlobs.map(globToRegExp);
  return [...new Set(files.map(rel))]
    .filter((file) => existsSync(file) && statSync(file).isFile() && !ignored.some((re) => re.test(file)))
    .sort();
};
