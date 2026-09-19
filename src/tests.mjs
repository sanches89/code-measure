import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { collect, parseXml } from "./xml.mjs";

export const notRequested = (flag) => ({ status: "skipped", reason: `no ${flag} given`, notRequested: true });

export const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
const has = (testcase, tag) => Object.hasOwn(testcase, tag);

/** Test cases of one JUnit XML text, as { name, outcome, seconds }. Suites nest to any depth. */
export const parseJunit = (text) => {
  const root = parseXml(text);
  if (!root.testsuites && !root.testsuite) return [];
  const cases = [];
  // A <testsuite> holds <testcase> and nested <testsuite>, so collect testcases from the top only.
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    for (const testcase of [].concat(node.testcase ?? [])) {
      if (typeof testcase !== "object") {
        cases.push({ name: "", outcome: "passed", seconds: 0 });
        continue;
      }
      const name = [testcase["@_classname"], testcase["@_name"]].filter(Boolean).join(" ");
      const outcome = has(testcase, "failure") || has(testcase, "error") ? "failed" : has(testcase, "skipped") ? "skipped" : "passed";
      cases.push({ name: oneLine(name), outcome, seconds: Number(testcase["@_time"]) || 0 });
    }
    visit(node.testsuite);
    visit(node.testsuites);
  };
  visit(root);
  return cases;
};

export const summarizeCases = (cases, top) => {
  const count = (outcome) => cases.filter((c) => c.outcome === outcome).length;
  return {
    total: cases.length,
    passed: count("passed"),
    failed: count("failed"),
    skipped: count("skipped"),
    seconds: Number(cases.reduce((sum, c) => sum + c.seconds, 0).toFixed(2)),
    failedTests: cases.filter((c) => c.outcome === "failed").slice(0, top).map((c) => c.name),
    slowest: [...cases].sort((x, y) => y.seconds - x.seconds).slice(0, 5).map((c) => ({ name: c.name, seconds: Number(c.seconds.toFixed(3)) })),
  };
};

export const measureTests = (testReports, settings) => {
  if (!testReports.length) return notRequested("--test-report");
  const reports = [];
  for (const path of testReports) {
    if (statSync(path).isDirectory()) reports.push(...readdirSync(path).filter((f) => f.toLowerCase().endsWith(".xml")).sort().map((f) => join(path, f)));
    else reports.push(path);
  }
  const cases = [];
  for (const report of reports) {
    try {
      cases.push(...parseJunit(readFileSync(report, "utf8")));
    } catch (error) {
      return { status: "failed", reason: `${report} is not valid XML: ${error.message}` };
    }
  }
  if (!cases.length) return { status: "failed", reason: `no <testcase> found in ${reports.length} report file(s). Expected JUnit XML.` };
  return { status: "ok", format: "junit", reports: reports.length, ...summarizeCases(cases, settings.top) };
};
