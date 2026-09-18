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
# without installing
npx code-measure src

# or install once
npm install --global code-measure
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
| `--compare <file>` | no | A summary saved from an earlier run. Adds `delta`, `worse`, and `notCompared`, and exits 3 when `worse` is not empty. |

A report file that does not exist is an error. One that is not the expected
format leaves its measurement `failed` with a reason, and the run still prints
a summary and exits 0.

### Limits

A function over any of these is counted in `complexity.overLimit` and listed in
`complexity.top`. They change what is reported, never what is measured.

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
| `--skip <list>` | none | Comma-separated measurements to skip: `duplication`, `complexity`, `hotspots`. `tests` and `coverage` skip themselves when no report is given. |
| `--since <date>` | `12 months ago` | Start of the git history window for hotspots. Any date `git log --since` accepts. |
| `--top <n>` | 20 | Entries per list: the clones, the functions over a limit, the hotspots, the failed tests, the least covered files, the files absent from the coverage report, and the functions by CRAP score. `tests.slowest` is always 5. |

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
| `2` | Invalid arguments: an unknown option, an option without a value, a number below 1, a path or report that does not exist, an unusable `--compare` file, or a limit passed alongside `--compare`. |
| `3` | `--compare` found at least one measurement that got worse. |

### Options fixed by `--compare`

`--compare` reuses the limits of the saved summary, so that both runs measure
the same way. Passing `--min-tokens`, `--min-lines`, `--ccn`, `--length`,
`--params`, or `--ignore` next to it is an error rather than a silent override.

Two things are not fixed: `--since` overrides the saved window when given, and
paths override the saved paths when given. Pass the new test and coverage
reports again — `--compare` carries limits, not results.

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

Read a single number out of the summary:

```bash
code-measure src --skip duplication,hotspots | jq '.complexity.overLimit.ccn'
```

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
