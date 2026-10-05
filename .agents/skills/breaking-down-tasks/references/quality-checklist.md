# Quality checklist

Run every check over the draft before showing it. One failure blocks
delivery. Fix it, or return to Step 3 for the missing decision, then run the
whole checklist again.

## Ambiguity

- [ ] No alternative, vague quantity, or unnamed thing: no
      `option A / option B`, `a few`, `the service`, `the relevant tests`.

## Completeness

- [ ] The open-decisions list is empty.
- [ ] Every fact, requirement, and success criterion of the original task is
      in the task.
- [ ] Every interview decision is in the task's Approach or Decisions, and
      every subtask that applies it restates it in its Context.
- [ ] Every success criterion of the task has a subtask acceptance criterion
      that covers it.
- [ ] Every path and symbol in Approach, Context, and Changes exists, as
      verified in research, or carries `(new)`.
- [ ] The task's References holds every entry of the original task. Every
      entry has a name, a URL, and what it settles, or the section holds
      exactly `None.`
- [ ] Every fact a reference settles is in the task's Decisions or
      Context, and in the Context of each subtask that lists it.
- [ ] The Subtasks list matches the subtasks written: same count, order, and
      titles. No dependency on a subtask with a higher number.
- [ ] Every section of the template is filled, in the task and in each
      subtask. The task's Verification holds concrete commands or steps.

## Subtask rule

- [ ] Each subtask has exactly one verification command, or one numbered
      manual sequence, and no ` and ` in its title.
- [ ] Each subtask above 500 code lines, as Step 4 counts, has no split
      whose parts meet every other constraint of Step 4.
- [ ] Each subtask is mergeable on its own: after it, the project builds and
      every test passes. A guard in its Context hides incomplete behavior.
- [ ] No subtask is only tests, only documentation, or only wiring. A later
      subtask depends on every behavior-free subtask.
- [ ] Two consecutive subtasks have separate verification.
- [ ] The subtask that completes a guarded behavior removes the guard, and
      no later subtask depends on that guard.

## Scope

- [ ] The union of all subtasks' Changes equals the task's Approach. Nothing
      outside it, nothing missing.
- [ ] Out of scope holds only topics from research or interview that a
      reader would expect in this task.
- [ ] No section beyond the template. No estimate, priority, or timeline
      unless the user asked.
- [ ] Every line serves the original task or an *Out of scope* entry: no
      remark or question from the conversation on another topic, no
      mention of another task to create.

## Executability

- [ ] An agent with only one subtask and the repository can implement it
      without opening the task or asking anything.
- [ ] The task's Context holds the build, lint, and test commands.
- [ ] Each subtask's Changes names every file to change, and each
      acceptance criterion is binary and checkable by someone else.
- [ ] No subtask contradicts a decision or an *Out of scope* entry of the
      task.

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
