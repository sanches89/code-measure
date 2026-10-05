# Task template

Sections: Refactor task sections; Task; Subtask.

Two formats: the **task** and the **subtask**. Fill every section and replace
every `<placeholder>`. Keep the headings exactly as written: they map onto
items and files. The task becomes the item body or `task.md`. Each subtask
becomes a child item or a `###-<subtask-slug>.md` file.

The task format is the one the `creating-tasks` and `breaking-down-tasks` skills
write and the `implementing-tasks` skill implements. Fill every section with
what the review, the measurements, and the code settled.

Rules for filling:
- Write facts in the present tense. Name real things: paths with line
  numbers, symbols, endpoints, tables, environment variables, commands. Mark
  a file that does not exist yet as `(new)`.
- Write quantities as numbers with units.
- `a | b` on a template line means: write a or b, never both.
- *Approach* says what changes where. *Decisions* holds the rules and values
  the change follows. Put each fact in one section only.
- *References* lists the sources for reviewers. The implementing agent never
  opens them: write every fact a source settles in *Decisions* or *Context*
  too.
- Repeat in a subtask the facts and decisions it needs. Never point at the
  task.
- In the draft, name titles and numbers on `Task`, `Depends on`, and in the
  Subtasks list. Step 9 replaces them with file links or item links at save
  time.

## Refactor task sections

Fill each section with what the review settled. Step numbers are those of
`SKILL.md`.

**The task:**
- *Title*: `Refactor <refactor scope in a few words>`.
- *Summary*: the refactor scope, the smells found, and the structure after
  every subtask.
- *Success criteria*: one per command from 3b, passing with no failure
  beyond the baseline, each baseline failure named. One per part of the
  contract from Step 2: same name, signature, and format, except a change
  the request names. One per entry: the structure after the change. The
  test counts: total not below the baseline, failed and skipped not above
  it. The coverage counts: uncovered lines and branches not above the
  baseline. The duplication and complexity values the entries change, with
  the target value.
- *In scope*: every file of the refactor scope.
- *Out of scope*: every bug found, with its location and the statement that
  the code keeps it. Every *Report* entry of `smell-catalog.md` found, by
  its location, with no credential value. Every finding past the cut of
  Step 6, as `next batch` with its location and smell. Every finding
  dropped in Step 5 or Step 6, with its reason. Every part removed from the
  refactor scope in Step 4. Every part of the contract, as a statement that
  it stays. Every *Out of scope* entry of a requested task, restated.
- *Approach*: one bullet per entry, in order: path and symbol, then the
  structure after the change.
- *Decisions*: the rules every entry follows, as `refactoring-rules.md`
  states. The conventions from 3a
  and 3c. The rule that a subtask applies one refactoring and gets one
  commit.
- *Context*: the commands from 3b with the report options from 3d, and the
  single-file test command. The analysis tools with their limits, the
  measure command from Step 4, and the scan command with its count per
  kind. The baseline: one line per measurement with its values, or
  `skipped` with the reason. The test coverage of every
  function the entries change. For kind *task*, the identifier or path of
  the requested task.
- *References*: `None.` Never copy the References of a requested task.
- *Subtasks*: one line per entry, in order, with its dependencies.
- *Verification*: the commands from 3b, then the test command with the
  report options, then the measure command from Step 4 over the same paths.

**Each subtask:**
- *Title*: the refactoring and the symbol, imperative, under 80 characters.
- *Goal*: the structure after the change, in one sentence.
- *Context*: the smell and its evidence, with every location as `path:line`.
  For *Convention drift*, the exemplar file. The tests that cover the code,
  or the statement that none does. The single-file test command. The rules
  from `refactoring-rules.md` and the
  conventions this refactoring follows, restated. Every part of the
  contract the change touches, as a statement that it stays. For a rename
  or a move across many files, the rewrite tool from
  `measurement-tools.md`.
- *References*: `None.`
- *Changes*: first, for an entry marked `characterization tests first`, the
  test file, `(new)` or existing, with every test case from Step 6 named.
  Then every file the refactoring changes, with the symbol and the structure
  after the change. A file it creates, marked `(new)`, with what it holds.
- *Acceptance criteria*: each named characterization test passes on the
  unchanged code and after the change. The structure after the change, as a
  binary check. The tests that cover the code pass. Every part of the
  contract the change touches keeps its name, signature, and format. No
  assertion of an existing test changed.
- *Verification*: the one command from Step 6.

---

## Task

```markdown
# <Title. Imperative, under 80 characters. Example: Add retry to webhooks>

## Summary

<Two or three sentences: what changes and why. No history of the discussion.>

## Success criteria

- <Observable, binary outcome. Example: POST /webhooks/payment returns 200
  after a transient upstream 503 that recovers within 3 attempts.>
- <...>

## Scope

### In scope

- <Deliverable.>
- <...>

### Out of scope

- <Adjacent topic. Not part of this task.>
- <... or the single word: None.>

## Approach

- <Path and symbol, then its behavior after the change. Example:
  src/payments/service.ts (PaymentService.send) retries the HTTP call per
  RetryPolicy and rethrows the last error after the final attempt.>
- <New component. Example: src/payments/retry-policy.ts (new) exports
  RetryPolicy.next(attempt), which returns the delay in ms or null.>
- <...>

## Decisions

- <Rule or value. Example: Backoff starts at 500 ms, doubles per attempt,
  stops after 5 attempts.>
- <Convention. Example: New tests live in tests/payments/ and use the
  WebhookFactory fixture from tests/factories.ts:12.>
- <...>

## Context

- <Fact with its origin. Example: Webhook handling lives in
  src/payments/webhooks.ts:41 (handlePaymentWebhook).>
- <Related item. Example: Related to PAY-212, which added the endpoint.>
- <Library fact with version. Example: axios 1.7 exposes retry only through
  interceptors.>
- <Commands. Example: build `npm run build`, tests `npm test -- tests/payments`,
  lint `npm run lint`.>
- <...>

## References

- <Source outside the repository and the tracker: name, URL, and what it
  settles. Example: Checkout design, frame "Retry banner",
  https://claude.ai/design/p/checkout. Settles the banner copy and layout.>
- <... or the single word: None.>

## Subtasks

1. <Subtask title>, depends on: none
2. <Subtask title>, depends on: 1
3. <...>

## Verification

1. <Exact command or manual step that proves a success criterion.>
2. <...>
```

---

## Subtask

```markdown
# <Title. Imperative, under 80 characters. Example: Add RetryPolicy>

**Task:** <task title in the draft; `./task.md` or the task's item link when
saved>
**Depends on:** none | <subtask numbers in the draft; links to the sibling files
or items when saved>

## Goal

<One sentence: what this subtask delivers.>

## Context

- <Only what this subtask needs, restated in full. Example:
  PaymentService.send() at src/payments/service.ts:88 performs the single HTTP
  call to retry.>
- <Decision, restated. Example: Backoff starts at 500 ms, doubles per attempt,
  stops after 5 attempts.>
- <Convention, restated. Example: New tests go in tests/payments/ and use the
  WebhookFactory fixture from tests/factories.ts:12.>
- <Guard, when the subtask hides incomplete behavior. Example: The new path is
  behind the PAYMENT_RETRY flag in src/config/flags.ts:20, default false,
  removed in subtask 4.>
- <...>

## References

- <A References entry of the task whose facts this subtask restates, in
  full: name, URL, and what it settles.>
- <... or the single word: None.>

## Changes

- `<path/to/file.ext>`: <symbol to add or change, its inputs and outputs, and
  the behavior on error.>
- `<path/to/new-file.ext>` (new): <what it contains.>
- `<path/to/test-file.ext>` (new | existing): <the test cases to add, named.>
- <...>

## Acceptance criteria

- <Binary check. Example: RetryPolicy.next(attempt) returns 500, 1000, 2000,
  4000, 8000 ms for attempts 1 to 5 and null for attempt 6.>
- <Binary check. Example: Existing tests in tests/payments/ still pass.>
- <...>

## Verification

`<one command that proves this subtask. Example: npm test -- retry.test.ts>`
```
