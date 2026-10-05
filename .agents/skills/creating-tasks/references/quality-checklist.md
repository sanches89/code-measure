# Quality checklist

Run every check and the grep helper over the draft. One failure blocks
delivery. Fix it, or return to the interview for the missing decision, then
run the whole checklist again.

## Ambiguity

- [ ] No alternative in Approach or Decisions: no `option A / option B`.
- [ ] Every quantity is a number with a unit: no `fast`, `small`, `a few`.
- [ ] Every named thing is a path, symbol, endpoint, table, environment
      variable, or command: no `the service`, `the relevant tests`.

## Completeness

- [ ] The open-decisions list is empty, and every interview decision is in
      Approach or Decisions.
- [ ] Every success criterion is binary, traces to a component in Approach,
      and has a Verification step that proves it.
- [ ] Every path and symbol in Approach and Context exists, as verified in
      research, or carries `(new)`.
- [ ] Every References entry has a name, a URL, and what it settles, or
      References holds exactly `None.`
- [ ] Every fact a reference settles is also in Decisions or Context.
- [ ] Verification holds concrete commands or steps, and Subtasks holds
      exactly `None.`

## Scope

- [ ] Every Approach bullet traces to the restated idea or a confirmed
      in-scope deliverable.
- [ ] Out of scope holds only topics from research or interview that a
      reader would expect in this task.
- [ ] No section beyond the template. No estimate, priority, or timeline
      unless the user asked.
- [ ] Every line serves the restated idea or an *Out of scope* entry: no
      remark or question from the conversation on another topic, no
      mention of another task to create.

## Executability

- [ ] An agent with only the task and the repository can implement it
      without asking anything.
- [ ] Every decision that changes the implementation is in Approach or
      Decisions, and Context holds the build, lint, and test commands.
- [ ] Approach names every file to change, and every success criterion is
      binary.
- [ ] The `breaking-down-tasks` skill can split the task without new research:
      every Approach component has a path.

## Grep helpers

Run over the draft. Remove every hit outside quoted user-interface text or
code.

```bash
grep -nEi \
  -e '\?|\bTBD\b|\bTBC\b|\bTODO\b|\bmaybe\b|\bmight\b|\bprobably\b' \
  -e '\bpossibly\b|\bperhaps\b|\bideally\b|\bconsider\b|\bcould\b' \
  -e 'should we|if needed|if necessary|as appropriate|as needed' \
  -e '\betc\b|and so on|or similar|something like|either .* or|one of the\b' \
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
