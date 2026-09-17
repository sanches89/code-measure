import assert from "node:assert/strict";
import test from "node:test";
import { extension, globToRegExp, isCode } from "../src/files.mjs";

test("globToRegExp matches ** across folders", () => {
  const re = globToRegExp("**/_generated/**");
  assert.equal(re.test("packages/backend/convex/_generated/api.ts"), true);
  assert.equal(re.test("packages/backend/convex/api.ts"), false);
});

test("globToRegExp keeps * inside one folder", () => {
  const re = globToRegExp("src/*.ts");
  assert.equal(re.test("src/a.ts"), true);
  assert.equal(re.test("src/deep/a.ts"), false);
});

test("globToRegExp matches a glob without a slash in any folder", () => {
  assert.equal(globToRegExp("*.min.js").test("web/assets/app.min.js"), true);
});

test("globToRegExp treats a dot as a literal", () => {
  assert.equal(globToRegExp("a.ts").test("axts"), false);
});

test("extension reads the last suffix of the file name, never of a folder", () => {
  assert.equal(extension("src/app.test.TS"), "ts");
  assert.equal(extension("v1.2/Makefile"), "");
});

test("isCode leaves out data and prose formats", () => {
  assert.equal(isCode("src/app.ts"), true);
  assert.equal(isCode("package.json"), false);
  assert.equal(isCode("README.md"), false);
});
