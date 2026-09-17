import { spawnSync } from "node:child_process";

export const run = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 15 * 60 * 1000, ...options });

export const firstLine = (text) => (text || "").trim().split("\n")[0].trim();

/** The first runner whose --version works, as { command, args, version }, or null. */
export const findRunner = (runners) => {
  for (const [command, ...args] of runners) {
    const result = run(command, [...args, "--version"], { timeout: 3 * 60 * 1000 });
    if (result.status === 0) return { command, args, version: firstLine(result.stdout) || firstLine(result.stderr) };
  }
  return null;
};
