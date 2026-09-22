# code-measure

Measure a codebase in any language before and after a refactoring. One command
prints one JSON summary with six measurements:

- **duplication**: duplicated lines and the largest clones, from
  [jscpd](https://github.com/kucherenko/jscpd), which reads more than 200
  languages.
- **complexity**: cyclomatic complexity, length, and parameter count per
  function, from [lizard](https://github.com/terryyin/lizard), which reads
  about 25 languages.
- **hotspots**: files that change often and are complex, from the git history.
- **tests**: unit test results, from JUnit XML reports.
- **coverage**: line and branch coverage, from LCOV, Cobertura XML, JaCoCo XML,
  or Go cover profile reports. With lizard, also coverage and
  [CRAP score](https://testing.googleblog.com/2011/02/this-code-is-crap.html)
  per function.
- **mutation**: mutants killed, survived, and not covered, the mutation score,
  and each surviving mutant, from Stryker, PIT, cargo-mutants, or Infection
  reports.

A second run with `--compare` names each value that got worse and exits 3.

The tool changes no file of the measured project and installs nothing into
it. A measurement whose tool is not found, or whose report is not given, is
marked `skipped` with a reason. It never fails the run.

## Install

Needs Node.js 22.13 or newer.

```bash
npm install --global code-measure
code-measure --version

# or run it without installing
npx code-measure src
```

Run it from the root of the project to measure. Inside a git checkout it
measures the files `git ls-files` lists, so the files `.gitignore` names stay
out. Outside one it walks the paths, skipping folders such as `node_modules`,
`vendor`, `dist`, `build`, and `target`. Leave generated and vendored code out
with `--ignore`, so that the numbers track the code the refactoring touches.

The package ships jscpd, so `duplication` needs nothing more. The other
measurements do:

| Measurement | Needs | Without it |
|---|---|---|
| `complexity` | lizard, installed as below | `skipped`. `hotspots` then weighs a file by its lines instead of its complexity, and `coverage` has no per-function coverage or CRAP score. |
| `hotspots` | git on `PATH`, and a git checkout of the measured project with at least one commit | `skipped` |
| `tests`, `coverage`, `mutation` | a report the project's own test or mutation command wrote, passed with `--test-report`, `--coverage-report`, or `--mutation-report` | `skipped` |

Install lizard once, in whichever of these ways the machine allows:

```bash
uv tool install lizard          # with uv: https://docs.astral.sh/uv/
pipx install lizard             # with pipx: https://pipx.pypa.io/
python3 -m pip install lizard   # with any Python 3
```

With uv installed, lizard needs no install of its own: the tool runs
`uvx lizard`, which fetches lizard on first use. The tool looks for `lizard`
on `PATH`, else `uvx lizard`, else `pipx run lizard`, else
`python3 -m lizard`, else `python -m lizard`.

Check the setup from the root of a project. Each tool measurement prints `ok`,
or the reason it was skipped:

```bash
code-measure src | jq '{duplication, complexity, hotspots} | map_values(.reason // .status)'
```

## Before and after

```bash
# 1. Run the project's own tests, with a JUnit report and a coverage report.
node --test --experimental-test-coverage \
  --test-reporter=junit --test-reporter-destination=/tmp/before-junit.xml \
  --test-reporter=lcov --test-reporter-destination=/tmp/before-lcov.info

# 2. Save the baseline.
code-measure src \
  --test-report /tmp/before-junit.xml \
  --coverage-report /tmp/before-lcov.info > /tmp/before.json

# 3. Refactor. Run the tests again into new report files. Then compare.
code-measure src \
  --test-report /tmp/after-junit.xml \
  --coverage-report /tmp/after-lcov.info \
  --compare /tmp/before.json > /tmp/after.json
echo $?   # 3 when a measurement got worse
```

The tool never runs the tests or the mutation tool. It reads the reports that
the project's own test command wrote. Nearly every test runner writes JUnit
XML, and one of LCOV, Cobertura, JaCoCo, or a Go cover profile:

| Test runner | Options |
|---|---|
| Node.js test runner | `--test-reporter=junit`, `--test-reporter=lcov` |
| Vitest | `--reporter=junit --outputFile=<file>`, `--coverage.reporter=lcov` |
| Jest | `--coverageReporters=lcov`; JUnit needs `jest-junit` |
| pytest | `--junitxml=<file>`, `--cov-branch --cov-report=xml:<file>` |
| Go | `-coverprofile=<file>` |
| Rust | `cargo llvm-cov --lcov --output-path <file>` |
| PHPUnit | `--log-junit <file>`, `--coverage-cobertura <file>` |
| .NET | `--collect:"XPlat Code Coverage"` |
| Maven, Gradle | `surefire-reports/`, `test-results/`, the JaCoCo XML report |

## What `--compare` checks

| Value | Worse when |
|---|---|
| `duplication.duplicatedLines`, `duplication.clones` | it rises |
| `complexity.overLimit.ccn`, `.length`, `.params` | it rises |
| `complexity.maxCcn` | it rises |
| `tests.total` | it falls: a test is gone |
| `tests.failed`, `tests.skipped` | it rises |
| `coverage.lines.uncovered`, `coverage.branches.uncovered` | it rises |
| `mutation.survived`, `mutation.noCoverage` | it rises |

It ignores the sum of complexity, because extracting a function raises that
sum by design. It ignores the coverage percentage, because removing covered
dead code lowers it with no test lost. It ignores the mutation score for the
same reason: removing code whose mutants the tests kill lowers it with no
assertion lost.

`--compare` reuses the limits and the ignore globs of the saved summary, so
that both runs measure the same way. See
[Options fixed by `--compare`](#options-fixed-by---compare) for what it does
and does not carry over.

## Options

```
code-measure [options] [<path>...]
```

Paths are files or folders, relative to the current directory. They default to
the current directory. A path that does not exist is an error.

### Reports to read

| Option | Repeatable | Meaning |
|---|---|---|
| `--test-report <path>` | yes | A JUnit XML file, or a folder: every `*.xml` directly inside it, in name order. Without it, `tests` is `skipped`. |
| `--coverage-report <file>` | yes | One LCOV, Cobertura XML, JaCoCo XML, or Go cover profile. The format is read from the content, not the file name, and several formats can be mixed in one run. Without it, `coverage` is `skipped`. |
| `--mutation-report <file>` | yes | One Stryker mutation-testing-report JSON (StrykerJS, Stryker.NET, Stryker4s), PIT `mutations.xml`, cargo-mutants `mutants.out/outcomes.json`, or Infection JSON log. The format is read from the content, and several formats can be mixed in one run. Without it, `mutation` is `skipped`. |
| `--compare <file>` | no | A summary saved from an earlier run. Adds `delta`, `worse`, and `notCompared`, and exits 3 when `worse` is not empty. |

A report file that does not exist is an error. One that is not the expected
format leaves its measurement `failed` with a reason, and the run still prints
a summary and exits 0.

### Limits

A function over `--ccn`, `--length`, or `--params` is counted in
`complexity.overLimit` and listed in `complexity.top`. Those three change what
is reported, never what is measured. `--min-tokens` and `--min-lines` set the
smallest clone jscpd counts, so they change the `duplication` numbers.

| Option | Default | Meaning |
|---|---|---|
| `--ccn <n>` | 10 | Limit for cyclomatic complexity per function. |
| `--length <n>` | 50 | Limit for function length in lines. |
| `--params <n>` | 4 | Limit for parameters per function. |
| `--min-tokens <n>` | 50 | Smallest clone to report, in tokens. |
| `--min-lines <n>` | 5 | Smallest clone to report, in lines. |

Each needs a whole number of 1 or more.

### Scope and size

| Option | Default | Meaning |
|---|---|---|
| `--ignore <globs>` | none | Comma-separated globs to leave out, such as `"**/generated/**,**/vendor/**"`. Supports `**`, `*`, and `?`. |
| `--skip <list>` | none | Comma-separated measurements to skip: `duplication`, `complexity`, `hotspots`. `tests`, `coverage`, and `mutation` skip themselves when no report is given. |
| `--since <date>` | `12 months ago` | Start of the git history window for hotspots. Any date `git log --since` accepts. |
| `--top <n>` | 20 | Entries per list: the clones, the functions over a limit, the hotspots, the failed tests, the least covered files, the files absent from the coverage report, the functions by CRAP score, the files with surviving or uncovered mutants, and the surviving mutants. `tests.slowest` is always 5. |

### Other

| Option | Meaning |
|---|---|
| `-h`, `--help` | Print every option and exit 0. |
| `-V`, `--version` | Print the version and exit 0. |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Summary printed. A `skipped` or `failed` measurement still exits 0. |
| `1` | Unexpected failure. |
| `2` | Invalid arguments: an unknown option, an option without a value, a number that is not a whole number of 1 or more, an unknown `--skip` name, a path or report that does not exist, an unusable `--compare` file, or a limit or `--ignore` passed alongside `--compare`. |
| `3` | `--compare` found at least one measurement that got worse. |

### Options fixed by `--compare`

`--compare` reuses the limits of the saved summary, so that both runs measure
the same way. Passing `--min-tokens`, `--min-lines`, `--ccn`, `--length`,
`--params`, or `--ignore` next to it is an error rather than a silent override.

Two things are not fixed: `--since` overrides the saved window when given, and
paths override the saved paths when given. Pass the new test, coverage, and
mutation reports again — `--compare` carries limits, not results.

## Examples

Measure the current directory, every default:

```bash
code-measure
```

Measure two folders, and skip a generated tree:

```bash
code-measure src lib --ignore "**/generated/**,**/*.pb.go"
```

Stricter limits than the defaults, more entries per list:

```bash
code-measure src --ccn 8 --length 40 --params 3 --top 40
```

Only duplication, with a lower clone floor to catch smaller copies:

```bash
code-measure src --skip complexity,hotspots --min-tokens 30 --min-lines 3
```

Only hotspots, over one release cycle instead of a year:

```bash
code-measure src --skip duplication,complexity --since "2024-01-01"
```

Tests and coverage from one Vitest run:

```bash
npx vitest run \
  --reporter=junit --outputFile=/tmp/junit.xml \
  --coverage --coverage.reporter=lcov --coverage.reportsDirectory=/tmp/cov
code-measure src \
  --test-report /tmp/junit.xml \
  --coverage-report /tmp/cov/lcov.info
```

Vitest needs `@vitest/coverage-v8` installed before `--coverage` works, and its
v8 provider may report only the files the tests import. Add
`--coverage.include='src/**'` when the coverage report covers fewer files than
`files` in the summary.

A folder of JUnit reports, and a coverage report per package, from a monorepo
where each workspace writes its own:

```bash
code-measure apps packages \
  --test-report /tmp/reports \
  --coverage-report apps/api/coverage/lcov.info \
  --coverage-report apps/web/coverage/lcov.info
```

Fail a CI job when the refactoring made something worse:

```bash
code-measure src --test-report /tmp/junit.xml --compare baseline.json > after.json \
  || { echo "a measurement got worse:"; jq -r '.worse[]' after.json; exit 1; }
```

Mutation score and surviving mutants from one StrykerJS run, which writes
`reports/mutation/mutation.json` with the json reporter:

```bash
npx stryker run --reporters json,clear-text
code-measure src --mutation-report reports/mutation/mutation.json
```

Read a single number out of the summary:

```bash
code-measure src --skip duplication,hotspots | jq '.complexity.overLimit.ccn'
```

## The summary

The summary has `"version": 1`. Every measurement has a `status` of `ok`,
`skipped`, or `failed`, and a `reason` for every status other than `ok`.
`delta`, `worse`, and `notCompared` appear only with `--compare`. The example
below leaves some fields out and empties most lists.

```json
{
  "version": 1,
  "tool": "code-measure 1.0.0",
  "paths": ["src"],
  "settings": { "top": 20, "minTokens": 50, "minLines": 5, "ccn": 10,
    "length": 50, "params": 4, "since": "12 months ago", "ignore": [] },
  "files": 57,
  "duplication": { "status": "ok", "duplicatedLines": 17, "clones": 1, "top": [] },
  "complexity": { "status": "ok", "functions": 441, "maxCcn": 15,
    "overLimit": { "ccn": 4, "length": 10, "params": 2 }, "top": [] },
  "hotspots": { "status": "ok", "complexityMeasure": "ccn", "top": [] },
  "tests": { "status": "ok", "total": 69, "passed": 69, "failed": 0, "skipped": 0 },
  "coverage": { "status": "ok", "format": "lcov",
    "lines": { "total": 18, "covered": 9, "uncovered": 9, "percentage": 50 },
    "branches": { "total": 8, "covered": 6, "uncovered": 2, "percentage": 75 },
    "functions": { "covered": 62, "partly": 20, "none": 3, "top": [] } },
  "mutation": { "status": "ok", "format": "stryker", "files": 12,
    "mutants": 340, "killed": 250, "timeout": 10, "survived": 60,
    "noCoverage": 20, "invalid": 6, "ignored": 4, "score": 76.47,
    "top": [{ "file": "src/parse.ts", "mutants": 40, "survived": 12,
      "noCoverage": 3, "score": 62.5 }],
    "survivors": [{ "file": "src/parse.ts", "line": 42, "function": "parseDate",
      "mutator": "EqualityOperator", "change": "a > b" }] },
  "delta": {}, "worse": [], "notCompared": []
}
```

A coverage report proves that a test runs a line. It never proves that a test
asserts the result. A mutation report does: a mutant that survives is a change
to a covered line that no assertion catches.

In `mutation`, `mutants` counts the mutants that reached a verdict: `killed`,
`timeout`, `survived`, and `noCoverage`. `score` is the share of them killed or
timed out. `invalid` mutants did not compile or crashed the runner, and
`ignored` ones never ran: both stay out of `mutants` and `score`. A mutant that
two reports name counts once, with its most detected status. `survivors` gives
each surviving mutant's line, the innermost lizard function around it (else
the function the report names), the mutator, and the change.

## Development

Needs Node.js 22.13 or newer, and pnpm. Install pnpm with
`npm install --global pnpm`, or with `corepack enable` on Node 22 or 24, which
bundle Corepack. Either way pnpm runs the version that `packageManager` in
`package.json` pins.

```bash
pnpm install
pnpm test
node bin/code-measure.mjs src   # the CLI, from this checkout
```

| Script | Runs |
|---|---|
| `pnpm test` | `node --test`, over every `tests/*.test.mjs`, with no network and no lizard |
| `pnpm run coverage` | the tests, with Node's coverage table |
| `prepublishOnly` | the tests, before `npm publish` |

Before pushing, run `pnpm test`. CI runs it on Node 22 and 24.

- Report fixtures live in `tests/fixtures/reports/`, and a small project to
  measure in `tests/fixtures/project/`.
- A push to `main` runs semantic-release (`.releaserc.json`). It reads the
  Conventional Commit subjects, publishes to npm, and commits the new
  `version` and `CHANGELOG.md`.

## License

[MIT](LICENSE)
