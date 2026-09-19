# Quality checklist

Run every check and the grep helpers over the draft. One failure blocks
delivery. Fix it, or return to Step 3 for the open decision, then run the
whole checklist again.

## Form

- [ ] Every entry is one bullet `- **Term**: definition.` under a `##`
      section, in alphabetical order inside the section.
- [ ] The header names the document set.

## Entry test

- [ ] Every term passes the three conditions of the entry test in Step 2d.
- [ ] Every term has at least one usage in the document set.

## Definitions

- [ ] Every definition starts with a noun phrase that names the kind of
      thing. It says what the thing is, not how it works.
- [ ] Every definition has at most two sentences and never uses its own
      term.

## Meaning

- [ ] No two entries define one thing, and no definition lists two
      meanings.
- [ ] Every conflict from research ends as a rename in the glossary report,
      with a qualifier or its own word per thing. The bare word has no entry.
- [ ] Every synonym pair from research ends as one word, and the retired
      word is in the glossary report.
- [ ] Every restatement matches its entry word for word, or the mismatch is
      in the glossary report.

## Report

- [ ] Every disagreeing usage and every fact taken out of a definition is
      in the glossary report with its path and line.
- [ ] Every removed entry is in the glossary report with the condition it
      failed or the word `unused`.
- [ ] The open-decisions list from research is empty.

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

Facts of an instruction inside a definition. Read every hit and move the
fact to the glossary report.

```bash
grep -nE -e '`[^`]*/[^`]*`|<[a-z-]+>|sections? of|in order:' \
  -e '\bwhen (a|the|it|no) ' <draft-file>
```

Terms with two definition texts across the draft and every restating
document. Every word printed is a failure.

```bash
awk 'FNR == 1 { t = (FILENAME == "<draft-file>") }
     /^## / { if (e) print e; e = "" }
     FILENAME != "<draft-file>" && /^## (Terms|Definitions|Glossary)/ {
       t = 1; next }
     FILENAME != "<draft-file>" && /^## / { t = 0 }
     /^- \*\*/ { if (e) print e; e = ""; if (t) e = $0; next }
     e && /^  / { sub(/^ +/, " "); e = e $0; next }
     END { if (e) print e }' <draft-file> <restating-files> \
  | sort -u | sed -E 's/^- \*\*([^*]+)\*\*.*/\1/' | uniq -d
```

Sentences over 25 words, a code span counted as one word. Every line printed
is a failure.

```bash
awk '/^```/ { c = !c; next } c || !NF { next }
     /^#|^ *[-*] / { print "." } { print }' <draft-file> \
  | tr '\n' ' ' | sed -E 's/`[^`]*`/X/g' | tr '.!?;:' '\n\n\n\n\n' \
  | awk 'NF > 25'
```
