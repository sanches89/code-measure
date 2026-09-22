# Quality checklist

Run every check and every grep helper over the draft. One failure blocks
delivery. Fix it, or return to the interview for the open decision, then run
the whole checklist again.

## Meaning

- [ ] Every fact and instruction of the input text is in the rewrite. The
      rewrite adds none beyond the input text and the Step 3 answers.
- [ ] Every passage with two readings is in the reading research or the
      user settled.
- [ ] Every code block, code span, URL, and quoted string is byte-identical
      to the input text.

## Words

- [ ] Every word has one meaning: each split meaning has its own term, and
      the bare word is gone.
- [ ] Every thing has one name, the glossary's when it has one, and every
      term keeps the glossary's meaning.
- [ ] No pronoun has two antecedents, and no `the <noun>` points at a thing
      the sentence does not name.
- [ ] Every quantity is a number with a unit.
- [ ] No `option A / option B` and no ungrouped `and/or`.

## Sentences

- [ ] Every instruction is one command with one action.
- [ ] Three or more parallel clauses or steps form a list, and an ordered
      sequence a numbered list. Short items stay inline, separated by
      commas.

## Structure

- [ ] Every heading of the input text is in the rewrite, at the same level
      and in the same order. Prose wraps at the width of Step 1.
- [ ] The rewrite follows every project rule recorded in Step 2d.

## Report

- [ ] Every ambiguity is under *Resolved* with its decision, every candidate
      under *Candidates*, and the open-decisions list is empty.

## Grep helpers

Banned words, questions, and alternatives. Remove every hit outside quoted
text or code.

```bash
grep -nEi \
  -e '\?|\bTBD\b|\bTBC\b|\bTODO\b|\bmaybe\b|\bmight\b|\bprobably\b' \
  -e '\bpossibly\b|\bperhaps\b|\bideally\b|\bconsider\b|\bcould\b' \
  -e 'should we|if needed|if necessary|as appropriate|as needed' \
  -e '\betc\b|and so on|or similar|something like|either .* or|one of the' \
  <draft-file>
```

Passive voice. Rewrite a hit that is an instruction as a command. A
definition or a state stays.

```bash
grep -nE '\b(is|are|was|were|be|been|being) +([a-z]+ly +)?[a-z]+(ed|en)\b' \
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
