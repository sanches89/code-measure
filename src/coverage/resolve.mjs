import { existsSync, statSync } from "node:fs";
import { rel } from "../files.mjs";

/**
 * Map a path of a coverage report to a file under the measured paths, or null.
 * A report names a file relative to the project, to a package folder, to a
 * source root, or by import path. `everyFile` lists every file of the project.
 */
export const createResolver = (inScope, everyFile) => {
  let byBase = null;
  const index = () => {
    byBase = new Map();
    for (const file of everyFile()) {
      const base = file.slice(file.lastIndexOf("/") + 1);
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(file);
    }
  };

  return (name, sources = []) => {
    const clean = name.replace(/\\/g, "/");
    const candidates = [clean, ...sources.filter(Boolean).map((source) => `${source.replace(/\\/g, "/").replace(/\/$/, "")}/${clean}`)];
    for (const candidate of candidates) {
      const file = rel(candidate);
      if (inScope.has(file)) return file;
      // A real file outside the measured paths: never guess a look-alike inside them.
      if (!file.startsWith("..") && existsSync(file) && statSync(file).isFile()) return null;
    }
    if (!byBase) index();
    const parts = clean.split("/").filter((part) => part && part !== ".");
    const sameBase = byBase.get(parts[parts.length - 1]) ?? [];
    for (let i = 0; i < parts.length; i++) {
      const tail = parts.slice(i).join("/");
      const hits = sameBase.filter((file) => file === tail || file.endsWith(`/${tail}`));
      if (hits.length === 1) return inScope.has(hits[0]) ? hits[0] : null;
      if (hits.length > 1) return null;
    }
    return null;
  };
};
