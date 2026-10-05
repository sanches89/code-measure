# Quality checklist

Run every check and the grep helper before returning the work report. One
failure blocks delivery. Fix it, then run the whole checklist again.

## Criteria

- [ ] The criteria checklist holds every criterion of the target, word for
      word, plus the target's Verification.
- [ ] Every ticked entry has evidence from a run made after the last edit.
- [ ] The *Criteria* counts equal the ticked and total criterion entries,
      Verification and command entries excluded.
- [ ] `done` only when every entry is ticked. Else `blocked`, every unticked
      entry under *Blocked by*, and the change so far still in the tree.

## Tests

Without a test setup: the diff adds no test and no test framework, and
*Affects other work* states the missing test setup.

- [ ] Every behavior the diff adds or alters has a test, and every test the
      target names exists.
- [ ] Every new test failed for the expected reason before it passed.
- [ ] A bug fix has a regression test.
- [ ] Every new test holds an assertion and tests one behavior.
- [ ] No new test uses a real network, clock, unseeded random value, sleep,
      or file outside a temporary folder. No double replaces the unit under
      test.
- [ ] Every test file this run added or edited passes when run alone.
- [ ] Every edited existing test asserts a behavior the target changes, or
      changed only in an import, a path, or a symbol name.
- [ ] The *Tests* count equals the test cases added.

## Scope

- [ ] The target's Changes or Approach section names every changed file, or
      *Deviations* lists it with its reason.
- [ ] The diff does nothing under any *Out of scope* of the chain, and
      nothing a sibling subtask delivers. It removes or loosens no check.
- [ ] The diff adds or removes every guard the target names.
- [ ] No task file, subtask file, or item changed. No commit, push, pull
      request, status change, or comment, unless the request asked.

## Report

- [ ] The headings are exactly those of `work-report-template.md`. *Blocked
      by* exists only on `blocked`.
- [ ] At most 30 non-blank lines, 2 lines per bullet, 25 words per
      sentence, `None.` in every empty section.
- [ ] No command output, no met criterion, no restated target text, no
      offer or next step.
- [ ] Every bullet under *Affects other work* is of a kind the template
      lists.
- [ ] Every path and symbol in the report exists in the working tree.

## Grep helper

Run over the report. Remove every hit outside quoted user-interface text or
code.

```bash
grep -nEi \
  -e '\?|\bTBD\b|\bTBC\b|\bTODO\b|\bmaybe\b|\bmight\b|\bprobably\b' \
  -e '\bpossibly\b|\bperhaps\b|\bideally\b|\bconsider\b|\bcould\b' \
  -e 'should we|if needed|if necessary|as appropriate|as needed' \
  -e '\betc\b|and so on|or similar|something like' \
  -e '\bI tried\b|\bat first\b|\bafter that\b' \
  <report-file>
```
