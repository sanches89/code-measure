# Orchestration report template

The orchestration report is all the caller keeps from a run: what landed
on the branch, what stayed open, and what the rest of the work needs. Make
every line a fact that changes what the caller does next. Keep the
headings exactly as written. Replace every `<placeholder>`.

Rules for filling:
- At most 50 non-blank lines, 2 lines per bullet, and 25 words per sentence.
- Present tense. Name real things: paths, symbols, commands, branch names,
  commit hashes, item identifiers.
- `a | b` on a template line means: write a or b, never both.
- The single word `None.` in a section with nothing to say.
- *Blocked by* only when the result is `blocked`. No section beyond the
  ones below.

What each section keeps:
- **Result**: `done` when every job is `done` or `skipped` and the proof
  passes, else `blocked`.
- **Branch**: the branch the commits are on and the commit the run started
  from, or `none: no git repository`.
- **Worktree**: its path when it still exists, else `removed`, else `none`.
- **Jobs** line: the number of jobs in each state, refactor jobs included.
- **Refactor rounds**: the number of rounds that ran, an empty round
  included. Reaching three is no failure.
- **Verification**: the target's one verification command, or
  `<number> steps` when its Verification is a list. `pass` only when every
  step passes. `not run` when a job is `blocked`.
- **Commits**: every commit a job made, in order.
- **Jobs** section: one line per job in plan order, with its state and its
  commit. A refactor job keeps its `R<round>.<n>` number.
- **Changes**: the *Changes* bullets of every work report, merged: one
  bullet per changed file, also on `blocked`. With more than 10 changed
  files, one bullet per folder: its path and what changed in it.
- **Deviations** and **Affects other work**: the bullets of the work
  reports that matter outside the target. Drop a bullet about a subtask
  this run has since worked, and a fact the plan carried to a later job.
  Add every wrong or stale fact found in a task file, a subtask file, or
  an item, with the correct fact.
- **Blocked by**: one bullet per blocked job and per failed proof: its
  cause and what unblocks it.

What the report leaves out:
- the steps taken, the prompts, and attempts that failed;
- command output, logs, stack traces, and code listings;
- the target's text restated, and met criteria;
- praise, apologies, offers, questions, and next-step suggestions.

---

## Orchestration report

```markdown
# Orchestration report: <target title>

**Result:** done | blocked
**Target:** <item identifier and URL | file path>
**Branch:** <branch> from <base commit> | none: no git repository
**Worktree:** <path> | removed | none
**Jobs:** <number> done, <number> skipped, <number> blocked, <number> not
started
**Refactor rounds:** <number>
**Verification:** `<verification command>` | <number> steps: pass | fail |
not run
**Commits:** none | <short hashes, in commit order>

## Jobs

- <subtask number or identifier | R<round>.<n>> <title>: done `<hash>` |
  skipped | blocked | not started
- <...>

## Changes

- `<path/to/file.ext>` (<symbol>): <behavior after the change. Example:
  PaymentService.send retries according to RetryPolicy.>
- `<path/to/new-file.ext>` (new): <what it holds.>
- <...>

## Deviations

- <What a target says, what was done, why. Example: Subtask 002 names
  src/pay/service.ts. The file is src/payments/service.ts, changed there.>
- <... or the single word: None.>

## Affects other work

- <Fact the rest of the work needs. Example: The task's Context names
  tests/payments/ for new tests. The project keeps them in src/__tests__/.>
- <... or the single word: None.>

## Blocked by

- <Job title | failing command>: <cause in one sentence>. Needs: <what
  unblocks it>.
- <...>
```
