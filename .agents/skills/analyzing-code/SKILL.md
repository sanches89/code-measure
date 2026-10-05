---
name: analyzing-code
description: Measures the duplication, complexity, hotspots, tests, coverage, and mutation score of one version of the code, the working tree or one branch, and reports ranked findings, changing no code. Use only when the user asks for it by name or asks for the code measured or analyzed, never to compare two versions or answer a general code question.
license: MIT
compatibility: Requires Node.js 22.13 or newer with npx and git, run inside a git repository, with network access on the first run. Complexity needs lizard on PATH, or uv, pipx, or a Python that has lizard. Tests and coverage need the project's own test command. Mutation needs the project's own mutation command. A missing tool skips its measurement and never blocks the report.
argument-hint: "[branch]"
disable-model-invocation: true
---

# Analyzing code

Take one version of a repository's code and measure its duplication,
complexity, hotspots, unit tests, coverage, and mutation score. Return a
measurement report. The skill never compares two versions: every number
describes the one version it measures.

A run can take hours. The mutation run runs the tests once per mutant, so
its time grows with the number of tests and mutants. Tell the user so when
the run starts.

## Hard rules

1. **The project stays as it is.** Change no project file. Add no
   dependency, tool, configuration file, JUnit report, coverage report, or
   mutation report to the repository. Write every report, summary, and
   note of the run in the scratch directory. A measurement of a changed
   tree describes no version the project has.
2. **Never ask what research can answer.** Consult the code, the docs, the
   git history, and the summary first. A question the summary answers
   costs the user time on top of a run of hours.
3. **Never assume.** When a decision changes the work and research cannot
   settle it, ask the user. An assumed name or command measures the wrong
   code.
4. **No outward actions.** Never commit, push, open a pull request, or post
   a comment. The measurement report is the only output.

## Workflow

### Step 1: Load the request

**Subagents.** When the agent offers subagents, run in one every read whose
whole product is the facts the step records. In Claude Code, that is the
`Agent` tool, with the `Explore` subagent for reads. Run in one every
command whose output the step reduces to a result. Give the subagent the
question, the paths, and the facts to return. It returns only those facts,
each with path and line. The context window then holds those returns, not
the files, and stays small. Without subagents, follow the step yourself and
keep only what it names.

Resolve the invocation text, or the request in the conversation, as one
kind:
- **Nothing**: the run measures the working tree, uncommitted and
  untracked files included.
- **One name**: a branch, a tag, or a commit. Confirm it with
  `git rev-parse --verify --quiet "<name>^{commit}"`. When the command
  fails, ask one question: which name to use. The run measures the
  committed code at that commit, never the uncommitted files.
- **Anything else**: ask one question: which one name to measure, or none.

Record the output of `git status --porcelain` and of
`git rev-parse --short HEAD`. With a name, record the measured commit: the
output of `git rev-parse --short "<name>^{commit}"`.

Write private notes in a scratch directory outside the repository, written
`<scratch-dir>` in commands (in Claude Code, the scratchpad directory). Keep
in the notes every list a later step reads.

`<root>` is the folder of the measured code. Without a name, it is the
output of `git rev-parse --show-toplevel`. With a name, run
`git worktree add --detach <scratch-dir>/measured <name>` from the repository
root, and `<root>` is `<scratch-dir>/measured`. Never check out, stash,
reset, or switch the working tree.

Run every command of Steps 2 to 6 from `<root>`, unless a step says
otherwise. Measure `<root>` in every run, with `.` as the path.

### Step 2: Inventory

**2a. Ignore globs.** List the tracked files that are generated, vendored,
or built:

```bash
git ls-files | grep -iE \
  -e '(^|/)(generated|__generated__|vendor|vendored|third_party)/' \
  -e '\.(min\.js|min\.css|pb\.go|pb\.ts|g\.dart|generated\.[a-z]+)$'
```

Record one glob per folder or extension found, such as `**/generated/**` or
`**/*.pb.go`. Add one glob per folder that the project's lint or coverage
configuration lists as generated. Record the globs as `<globs>`, joined by
commas.

**2b. Limits.** Read `references/measure-tool.md` now. Record `<ccn>`,
`<length>`, and `<params>`: the project's own limits when it configures
them, else 10, 50, and 4.

**2c. Install and test commands.** Read `references/test-reports.md` now.
Record, as that file says:
- the install command, `none`, or `unknown`;
- the test command with the report options, with `<dir>` in place of the
  output folder;
- `<junit-report>` and `<coverage-report>`: the paths of the JUnit report
  and the coverage report relative to `<dir>`, or the reason a report is
  skipped.

Skip Step 3 when the runner writes neither report.

**2d. Mutation command.** Read `references/mutation-reports.md` now.
Record, as that file says, the mutation command and `<mutation-report>`.
The command holds the report options and the thread option, with `<dir>`
in place of the output folder. Record the reason instead when the file
says to skip the mutation run.

### Step 3: Tests

Set `<dir>` to `<scratch-dir>/reports` in every command of Steps 3 to 5.

With a name, run the install command first, unless it is `none` or
`unknown`. With a name and the install command `unknown`, record the
tests and coverage as skipped with the reason `no install command`, and
go to Step 4.

Run the test command. Without a name, when it fails to start on a missing
dependency, run the install command once and the test command again. Skip
both when the install command is `none` or `unknown`. Afterwards do the
step that `test-reports.md` gives for .NET, Maven, and Gradle. A failing
test is a result, not a failure of the run. When the install command fails,
or the test command writes neither report, record the tests and coverage
as skipped. The reason is the first line of the error.

### Step 4: Mutation

Skip this step when Step 2d recorded a reason. Run the mutation command
from the folder that `mutation-reports.md` names, else from `<root>`. Let
it finish, however long it takes (in Claude Code, run it in the
background). Afterwards do the step that `mutation-reports.md` gives for
the tool. A surviving mutant is a result, not a failure of the run. When
the mutation command fails, or writes no report, record the first line of
the error as the reason.

### Step 5: Measure

Run the measure tool:

```bash
<measure> . --ignore "<globs>" --ccn <ccn> --length <length> \
  --params <params> --top 200 \
  --test-report <scratch-dir>/reports/<junit-report> \
  --coverage-report <scratch-dir>/reports/<coverage-report> \
  --mutation-report <scratch-dir>/reports/<mutation-report> \
  > <scratch-dir>/summary.json
```

Leave out `--ignore` with no glob, and each report option without its
report. Pass `--mutation-report` once per mutation report.

On exit code `2`, fix the arguments and run the command again. On `1`, or
when the measure command fails to start, go to Step 7. The result is then
`blocked`, with the first line of the error as the reason.

### Step 6: Read the code

Read `references/analysis-rules.md` now. A number alone is never a finding:
read the code behind each entry that file names, both locations of a clone
included. Record per finding:
- the kind, and the location as `path:line` with the symbol;
- the evidence: the measured values, or what the code shows;
- the action, from the *Actions* section of `analysis-rules.md`.

Group the entries by folder and run one subagent per folder. Give it the
entries of its folder, both locations of each clone, and the path of
`references/analysis-rules.md`.

Rank the findings as the *Ranking* section of `analysis-rules.md` says.

### Step 7: Measurement report

Read `references/measurement-report-template.md` now and fill it in the
scratch directory. Run every check in `references/quality-checklist.md`,
grep helper included, over the measurement report. Fix every failure.

### Step 8: Deliver

With a name, run from the repository root
`git worktree remove --force <scratch-dir>/measured`, then
`git worktree prune`. Run both also when an earlier step fails. Confirm
that `git worktree list` names no folder under `<scratch-dir>`.

Send the measurement report as the final message, unchanged. Ask nothing and
offer nothing after it.
