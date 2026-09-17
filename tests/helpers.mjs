import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
export const readFixture = (name) => readFileSync(fixture(name), "utf8");
export const projectDir = fixture("project");
export const binFile = fileURLToPath(new URL("../bin/code-measure.mjs", import.meta.url));
