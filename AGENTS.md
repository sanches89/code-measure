# code-measure

An npm CLI that prints one JSON summary of a codebase, to compare before and
after a refactoring. Plain Node.js ESM (`.mjs`), no build step, pnpm.

- Never write into the measured project, install anything into it, or run
  its tests or mutation tool.
- Mark a measurement `skipped`, with a `reason`, when its tool is not found
  or no report is given. Mark it `failed`, with a `reason`, when its tool
  errors or its report cannot be used. Never stop the run over one
  measurement.

## Where code goes

- A new measurement: `src/<name>.mjs`, called from `measure` in
  `src/cli.mjs`.
- A new report format: `src/coverage/formats.mjs` for coverage,
  `src/mutation/formats.mjs` for mutation, detected by that file's
  `readReport`.
- A new option: `src/args.mjs`.
- A new value for `--compare` to check: `PAIRS` in `src/compare.mjs`.
- Tests: `tests/<module>.test.mjs`. Put report fixtures in
  `tests/fixtures/reports/`, and files to measure in `tests/fixtures/project/`.

## Checks

- Run `pnpm test` before calling a change done. CI runs it on Node 22 and 24.

## Tests

- Keep `pnpm test` free of network and lizard. Test a parser against a
  fixture. Run the CLI with `--skip duplication,complexity,hotspots`.

## Git

- Write commit subjects as Conventional Commits (`feat:`, `fix:`, `docs:`,
  `ci:`, `chore:`): semantic-release picks the next version from them.
- Never edit `version` in `package.json` or `CHANGELOG.md`: the `release`
  job in `.github/workflows/ci.yml` commits both.

## Docs

- Before editing an AGENTS.md, CLAUDE.md, README.md, ADR, docs/refs/ file or
  GLOSSARY.md, load the agent-docs skill.
- README.md is the npm page. Keep the CLI's user documentation in it, above
  the "Development" runbook. This rule outranks the agent-docs rule that a
  README is a short runbook.
- Update README.md and `src/help.mjs` in any change to an option, a default,
  an exit code, a summary field or a `--compare` value. No test compares
  them.
