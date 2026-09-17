import { asArray, collect, parseXml } from "../xml.mjs";
import { addBranch, addLine, entryFor } from "./data.mjs";

/** LCOV: SF, DA:<line>,<hits>, BRDA:<line>,<block>,<branch>,<taken>, end_of_record. */
export const parseLcov = (text, data) => {
  let entry = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("SF:")) entry = entryFor(data, line.slice(3));
    else if (line === "end_of_record") entry = null;
    else if (entry && line.startsWith("DA:")) {
      const [number, hits] = line.slice(3).split(",");
      addLine(entry, Number(number), Number(hits) || 0);
    } else if (entry && line.startsWith("BRDA:")) {
      const [number, block, branch, taken] = line.slice(5).split(",");
      addBranch(entry, `${number},${block},${branch}`, Number(number), Number(taken) > 0 ? 1 : 0, 1);
    }
  }
};

/** Cobertura XML: <class filename> with <line number hits condition-coverage="50% (1/2)">. Pushes each <source> root to `sources`. */
export const parseCobertura = (root, data, sources) => {
  for (const source of collect(root, "source")) sources.push(String(typeof source === "object" ? source["#text"] ?? "" : source).trim());
  for (const cls of collect(root, "class")) {
    if (!cls?.["@_filename"]) continue;
    const entry = entryFor(data, cls["@_filename"]);
    // <methods> repeats the lines of <lines>. The data keeps the highest value per line.
    for (const line of collect(cls, "line")) {
      const number = Number(line["@_number"]);
      addLine(entry, number, Number(line["@_hits"]) || 0);
      const condition = /\((\d+)\/(\d+)\)/.exec(line["@_condition-coverage"] ?? "");
      if (condition) addBranch(entry, String(number), number, Number(condition[1]), Number(condition[2]));
    }
  }
};

/** JaCoCo XML: <package name="a/b"> with <sourcefile name> and <line nr mi ci mb cb>. */
export const parseJacoco = (root, data) => {
  for (const pkg of collect(root, "package")) {
    for (const file of asArray(pkg.sourcefile)) {
      const entry = entryFor(data, [pkg["@_name"], file["@_name"]].filter(Boolean).join("/"));
      for (const line of asArray(file.line)) {
        const number = Number(line["@_nr"]);
        addLine(entry, number, Number(line["@_ci"]) || 0);
        const missed = Number(line["@_mb"]) || 0;
        const covered = Number(line["@_cb"]) || 0;
        if (missed + covered) addBranch(entry, String(number), number, covered, missed + covered);
      }
    }
  }
};

/** Go cover profile: <file>:<line>.<col>,<line>.<col> <statements> <count>. It has no branch data. */
export const parseGoProfile = (text, data) => {
  for (const raw of text.split("\n")) {
    const match = /^(.+):(\d+)\.\d+,(\d+)\.\d+ \d+ (\d+)$/.exec(raw.trim());
    if (!match) continue;
    const entry = entryFor(data, match[1]);
    for (let line = Number(match[2]); line <= Number(match[3]); line++) addLine(entry, line, Number(match[4]));
  }
};

/** "lcov", "go", "cobertura", "jacoco", or null. */
export const detectFormat = (text) => {
  const head = text.slice(0, 4000);
  if (/^mode: (set|count|atomic)\s*$/m.test(head)) return "go";
  if (/^(TN:|SF:)/m.test(head)) return "lcov";
  if (/<coverage[\s>]/.test(head)) return "cobertura";
  if (/<report[\s>]/.test(head)) return "jacoco";
  return null;
};

/** Read one report text into `data`. Returns its format, or null when the format is unknown. */
export const readReport = (text, data, sources) => {
  const format = detectFormat(text);
  if (format === "lcov") parseLcov(text, data);
  else if (format === "go") parseGoProfile(text, data);
  else if (format === "cobertura") parseCobertura(parseXml(text), data, sources);
  else if (format === "jacoco") parseJacoco(parseXml(text), data);
  return format;
};
