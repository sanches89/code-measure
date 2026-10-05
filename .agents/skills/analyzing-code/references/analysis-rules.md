# Analysis rules

Sections: What to read; Clones; Functions over a limit; Hotspots; Tests;
Coverage; Surviving mutants; Actions; Ranking.

Read this file in Step 6. A function is a function, a method, or a
procedure. A module is a class, a file, or a package. A finding is one
location that these rules keep after its code is read, with its evidence
and its action.

## What to read

Read the code behind these entries of `summary.json`:
- the first 10 entries of `duplication.top`;
- the first 10 entries of `complexity.top`;
- the first 5 entries of `hotspots.top`;
- every name in `tests.failedTests`, with its message in the JUnit report;
- the first 10 entries of `coverage.functions.top`;
- the first 5 entries of `coverage.top`;
- the first 5 entries of `coverage.filesNotInReport`;
- the first 10 entries of `mutation.survivors`.

Read a function from its `line` to its end. Read both locations of a clone.
For a hotspot, read the last 10 commit subjects of the file:
`git log -10 --format=%s -- <file>`.

## Clones

Keep a clone as a finding of kind `duplicated code` when both copies state
one rule and change for the same reason. The action is `extract function`
when the copies are in one module, else `move to a shared module`. The
evidence is the two locations and the line count.

Leave a clone when:
- it holds only imports, declarations, or type definitions;
- it is test data, a fixture, or a table of literals;
- it is in generated code: the first line of the file says so;
- the copies change for different reasons, such as two external formats
  that look alike today.

## Functions over a limit

Keep a function as a finding when the code shows the smell behind the value
over the limit:
- `ccn` over the limit, and the branches are not one flat `switch` or
  mapping from values to results. Kind `complex function`. Action
  `replace nested conditionals with guard clauses` when conditionals nest
  3 levels or deeper, else `extract function`;
- `length` over the limit, and the body is not one flat list of steps
  without a branch. A route list and a configuration table are such lists.
  Kind `long function`. Action `extract function`;
- `params` over the limit, and the signature is not one that callers
  outside the repository depend on. Kind `long parameter list`. Action
  `introduce parameter object`.

The evidence is the measured values against their limits. A test function
over a limit is a finding of the same kind, ranked after every other
finding.

## Hotspots

A hotspot is a finding only when its file holds an entry of
`complexity.top`, `duplication.top`, `coverage.functions.top`, or
`mutation.survivors` that these rules keep. Then the finding is that entry,
ranked by the hotspot score of the file under *Ranking*, with the commit
subjects added to its evidence: what kind of change keeps hitting the file.
A hotspot with no such entry appears only on the *Hotspots* line under
*Measurements*.

## Tests

Every failed test is a finding of kind `failed test`. The evidence is the
first line of its failure message from the JUnit report. The action
is `fix the test or the code`. A skipped test is never a finding: the
*Unit tests* line under *Measurements* counts skipped tests. A slow test is
never a finding.

## Coverage

- A function in `coverage.functions.top` with `crap` of 30 or more is a
  finding of kind `untested complex function`. The action is
  `add tests before changing it`. A function with `crap` below 30 is a
  finding only when it is also over a limit. Then the finding is the
  function over the limit, with the action
  `add tests, then <the action of its kind>`.
- A file in `coverage.filesNotInReport` that holds a function is a finding
  of kind `file no test loads`, one finding per file. The action is
  `add tests`. Leave a file that holds only declarations, types, or
  constants.

## Surviving mutants

An entry of `mutation.survivors` is a mutant that every test passed on: no
assertion checks what its change breaks.

Keep one finding of kind `surviving mutant` per `function`. An entry whose
`function` is `null` is a finding of its own. The location is the line of
the first entry. The evidence is the count of entries and the `change` of
the first one. The action is `assert the behavior the mutant changes`.

Leave an entry whose mutant is equivalent: no input makes the changed code
return another result or leave another state. Examples:
- `i < n` to `i != n` in a loop that steps by 1 and starts below `n`;
- a changed log message, or a changed error text that no caller reads;
- a removed call whose only effect is a cache or a metric.

When the function is already a finding of another kind, add the count of
entries to the evidence of that finding instead. An entry of
`mutation.top` alone is never a finding: its mutants with no coverage are
lines that the coverage rules read.

## Actions

The action of a finding is an item of this list, or two items joined by
`, then`:
- `fix the test or the code`;
- `add tests`;
- `add tests before changing it`;
- `assert the behavior the mutant changes`;
- `extract function`;
- `replace nested conditionals with guard clauses`;
- `introduce parameter object`;
- `move to a shared module`.

## Ranking

Order the findings:
1. every failed test;
2. every other finding, by the hotspot score of its file, highest first. A
   file with no score comes after every file with one;
3. inside one rank, by `crap`, then `ccn`, then clone lines, then surviving
   mutants, highest first.

Keep at most 12 findings. Count the findings left out, per kind, for the
*Skipped* section of the measurement report.
