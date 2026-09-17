# code-measure

Measure a codebase in any language before and after a refactoring. One command
prints one JSON summary with five measurements:

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

A second run with `--compare` says which measurement got worse and exits 3.

The tool changes no file of the measured project and installs nothing into
it. A measurement whose tool or report is missing is marked `skipped` with a
reason. It never fails the run.

## Run

Needs Node.js 20 or newer. Run it from the root of the project to measure.

```bash
# without installing, pinned to major version 1
npx --yes "github:sanches89/code-measure#semver:^1" src

# or install once
npm install --global "github:sanches89/code-measure#semver:^1"
code-measure src
```

Complexity needs lizard. The tool runs `lizard` from `PATH`, else
`uvx lizard`, else `pipx run lizard`, else `python3 -m lizard`. Install
[uv](https://docs.astral.sh/uv/) or pipx to enable it.

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

The tool never runs the tests. It reads the reports that the project's own
test command wrote. Nearly every test runner writes JUnit XML, and one of
LCOV, Cobertura, or JaCoCo:

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

It ignores the sum of complexity, because extracting a function raises that
sum by design. It ignores the coverage percentage, because removing covered
dead code lowers it with no test lost.

`--compare` reuses the limits and the ignore globs of the saved summary, so
that both runs measure the same way.

## Options

Run `code-measure --help` for every option. The defaults:

| Option | Default | Meaning |
|---|---|---|
| `--ccn` | 10 | limit for cyclomatic complexity per function |
| `--length` | 50 | limit for function length in lines |
| `--params` | 4 | limit for parameters per function |
| `--min-tokens`, `--min-lines` | 50, 5 | smallest clone |
| `--since` | `12 months ago` | git history window for hotspots |
| `--top` | 20 | entries per list |
| `--ignore` | none | comma-separated globs to leave out |
| `--skip` | none | `duplication`, `complexity`, `hotspots` |

Exit codes: `0` summary printed, `1` unexpected failure, `2` invalid
arguments, `3` `--compare` found a worse measurement.

## The summary

The summary has `"version": 1`. Every measurement has a `status` of `ok`,
`skipped`, or `failed`, and a `reason` for every status other than `ok`.

```json
{
  "version": 1,
  "tool": "code-measure 1.0.0",
  "paths": ["src"],
  "duplication": { "status": "ok", "duplicatedLines": 17, "clones": 1, "top": [] },
  "complexity": { "status": "ok", "functions": 441, "maxCcn": 15,
    "overLimit": { "ccn": 4, "length": 10, "params": 2 }, "top": [] },
  "hotspots": { "status": "ok", "complexityMeasure": "ccn", "top": [] },
  "tests": { "status": "ok", "total": 69, "passed": 69, "failed": 0, "skipped": 0 },
  "coverage": { "status": "ok", "format": "lcov",
    "lines": { "total": 18, "covered": 9, "uncovered": 9, "percentage": 50 },
    "branches": { "total": 8, "covered": 6, "uncovered": 2, "percentage": 75 },
    "functions": { "covered": 62, "partly": 20, "none": 3, "top": [] } },
  "delta": {}, "worse": [], "notCompared": []
}
```

A coverage report proves that a test runs a line. It never proves that a test
asserts the result.

## Development

```bash
npm install
npm test            # node --test, no network and no lizard needed
npm run coverage
```

The tests live in `tests/`, with report fixtures in `tests/fixtures/`.

## License

[MIT](LICENSE)
