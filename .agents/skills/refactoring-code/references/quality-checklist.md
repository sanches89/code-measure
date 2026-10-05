# Quality checklist

Sections: Ambiguity; Behavior and contract; Subtask rule; Measurements;
Completeness; Executability; Grep helpers.

Run every check over the draft before showing it. One failure blocks
delivery. Fix it, or return to the step that owns the missing fact, then run
the whole checklist again.

## Ambiguity

- [ ] Every quantity is a number with a unit. Every named thing is a path,
      symbol, endpoint, table, environment variable, or command.

## Behavior and contract

- [ ] No subtask adds a feature, fixes a bug, or tunes performance. Every
      wrong-looking behavior is under *Out of scope* with its location.
- [ ] Every part of the contract from Step 2 has a success criterion that
      keeps it. The only exception is a change the request names, stated in
      Approach.
- [ ] No subtask deletes, skips, or loosens a test, lint rule, or type
      check. No assertion gets weaker, and an assertion changes only by
      Replace Assertion with Literal.
- [ ] Every file a subtask changes is in the refactor scope, or is a caller
      moved by a contract change the request names.
- [ ] No subtask touches generated or vendored code, a lockfile, build
      output, a snapshot, or a migration that already ran.
- [ ] No subtask does what a task read in Step 2 lists under *Out of scope*.
- [ ] No subtask adds a dependency, tool, configuration file, or code
      pattern the project does not use.

## Subtask rule

- [ ] Each subtask applies one refactoring named in `smell-catalog.md`, and
      its Context names the smell with its evidence.
- [ ] Each subtask has one verification command, which ran on the current
      code and failed.
- [ ] After each subtask, the project builds and every test passes.
- [ ] A subtask on uncovered code is from the safe set, or its Changes name
      a characterization test file before the code. That file lists every
      test case: normal path, boundaries, errors.
- [ ] Without a test setup, every subtask is from the safe set and none
      names a test or a test framework.
- [ ] A contract change the request names is three subtasks: add the new
      form, move the callers, remove the old form.
- [ ] Dependencies form a valid order: no cycle, no higher number. Remove
      Dead Code and Rename come first.
- [ ] At most 12 subtasks. Every finding past the cut is under *Out of
      scope* as `next batch`, with its location and smell.
- [ ] Every subtask in a test file applies an entry under *Tests* in
      `smell-catalog.md`.
- [ ] A seam subtask gives the parameter a default equal to the current
      collaborator, and no caller changes in it.

## Measurements

- [ ] Every baseline value in Context equals the Step 4 summary and reports.
      Every skipped measurement reads `skipped` with its reason.
- [ ] Success criteria state the test and coverage counts against the
      baseline, and Verification holds the commands that produce them.
- [ ] The repository holds no summary and no tool report.
- [ ] Every `credential` signal is under *Out of scope* by location alone.
      No task or subtask holds a key, a token, or a password value.
- [ ] Every scan signal that became a finding was read in Step 5. Every
      *Report* entry found is under *Out of scope*.

## Completeness

- [ ] Every finding of Step 5 is a subtask or an *Out of scope* entry with
      its reason.
- [ ] Every path and symbol in Approach, Context, and Changes exists in the
      working tree, or carries `(new)`.
- [ ] The task's Subtasks list matches the subtasks written: count, order,
      titles. The union of the subtasks' Changes equals Approach.
- [ ] The task's Verification lists the commands from 3b, the test command
      with report options, and the measure command.
- [ ] Every section of the template is filled, and no other section exists.

## Executability

- [ ] An agent with only the task and the repository can start subtask 1
      without asking anything.
- [ ] An agent with only one subtask and the repository can implement it
      without opening the task.
- [ ] Each acceptance criterion is binary and checkable by someone else.

## Grep helpers

Run over the draft. Remove every hit outside quoted user-interface text or
code.

```bash
grep -nEi \
  -e '\?|\bTBD\b|\bTBC\b|\bTODO\b|\bmaybe\b|\bmight\b|\bprobably\b' \
  -e '\bpossibly\b|\bperhaps\b|\bideally\b|\bconsider\b|\bcould\b' \
  -e 'should we|if needed|if necessary|as appropriate|as needed' \
  -e '\betc\b|and so on|or similar|something like|either .* or|one of the\b' \
  -e 'see task|see parent|as above|same as subtask|as described earlier' \
  <draft-file>
```

Sentences over 25 words, with a code span counted as one word. Every line
printed is a failure.

```bash
awk '/^```/ { c = !c; next } c || !NF { next }
     /^#/ { print "."; next }
     /^ *[-*] |^\|/ { print "." } { print }' <draft-file> \
  | tr '\n' ' ' | sed -E 's/`[^`]*`/X/g' | tr '.!?;:' '\n\n\n\n\n' \
  | awk 'NF > 25'
```
