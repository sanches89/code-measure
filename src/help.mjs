export const HELP = `Usage: code-measure [options] [<path>...]

Measure the files and folders given as paths (default: the current directory)
and print one JSON summary on stdout. Run it from the root of the measured
project. It changes no file of the project and installs nothing into it.

Measurements:
  duplication  jscpd: duplicated lines, clone count, the largest clones.
  complexity   lizard: per function cyclomatic complexity (ccn), length in
               lines, and parameter count, against the limits below.
               Runs "lizard" from PATH, else "uvx lizard", else
               "pipx run lizard", else "python3 -m lizard", else
               "python -m lizard".
  hotspots     git: commits per file since --since, multiplied by the file's
               summed ccn, or by its non-blank lines when lizard did not run.
  tests        Test results from JUnit XML reports that the project's own
               test command wrote: total, passed, failed, skipped, the failed
               tests, the slowest tests. Needs --test-report.
  coverage     Line and branch coverage of the files under the paths, from
               reports that the project's own coverage command wrote. Reads
               LCOV, Cobertura XML, JaCoCo XML, and Go cover profiles. With
               lizard it adds coverage and CRAP score per function, where
               CRAP = ccn^2 * (1 - coverage)^3 + ccn. Needs --coverage-report.
  mutation     Mutants of the files under the paths, from reports that the
               project's own mutation tool wrote: killed, timed out,
               survived, not covered, invalid, ignored, the mutation score,
               and each surviving mutant with its file, line, and function.
               Reads Stryker JSON, PIT mutations.xml, cargo-mutants
               outcomes.json, and Infection JSON logs. Needs --mutation-report.

This tool never runs the tests or the mutation tool. Run the project's test
or mutation command first, then pass the report files it wrote.

A measurement whose tool or report is missing gets "status": "skipped" and a
reason. It never fails the run.

Options:
  --compare <file>    A summary saved from an earlier run. Reuses its limits,
                      and its paths when no path is given. Adds "delta" and
                      "worse" to the output and exits 3 when "worse" is not
                      empty. Pass the report files of the new test run again.
                      Worse means: a value rose, or "tests.total" fell.
  --test-report <path>
                      A JUnit XML file, or a folder of them. Repeatable.
  --coverage-report <file>
                      A coverage report: LCOV, Cobertura XML, JaCoCo XML, or
                      a Go cover profile. Repeatable.
  --mutation-report <file>
                      A mutation report: Stryker JSON, PIT mutations.xml,
                      cargo-mutants outcomes.json, or an Infection JSON log.
                      Repeatable.
  --ignore <globs>    Comma-separated globs to leave out, such as
                      "**/generated/**,**/vendor/**". Supports **, * and ?.
  --skip <list>       Comma-separated measurements to skip: duplication,
                      complexity, hotspots.
  --top <n>           Entries per list (default: 20)
  --min-tokens <n>    Smallest clone in tokens (default: 50)
  --min-lines <n>     Smallest clone in lines (default: 5)
  --ccn <n>           Limit for cyclomatic complexity per function
                      (default: 10)
  --length <n>        Limit for function length in lines (default: 50)
  --params <n>        Limit for parameters per function (default: 4)
  --since <date>      Start of the git history window for hotspots
                      (default: "12 months ago")
  -V, --version       Print the version and exit
  -h, --help          Print this help and exit

Exit codes:
  0  summary printed
  1  unexpected failure
  2  invalid arguments
  3  --compare found at least one measurement that got worse

Examples:
  code-measure src > /tmp/before.json
  code-measure src lib/new-file.ts --compare /tmp/before.json > /tmp/after.json
  code-measure --skip hotspots --ignore "**/gen/**"
  code-measure src --test-report /tmp/junit.xml --coverage-report /tmp/lcov.info
  code-measure src --mutation-report reports/mutation/mutation.json
`;
