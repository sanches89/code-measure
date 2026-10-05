# Quality checklist

Run every check and the grep helper before returning the update report. One
failure blocks delivery. Fix it, then run the whole checklist again.

## Files

- [ ] Only manifests under the paths of Step 1 and their lockfiles changed.
      Every lockfile change comes from the plain install.
- [ ] No dependency added, removed, or moved. No test, lint rule, or type
      check loosened. No `.ncurc` file.
- [ ] No commit, push, or pull request unless the request asked. With
      commits requested, one commit per accepted plan entry.

## Versions

- [ ] No range names a prerelease version, unless its current range names
      one, a deprecated version, or a version inside the cooldown.
- [ ] The `engines.node` field of every new version allows `<node-version>`.
      The `@types/node` major equals its major, or the package is held.
- [ ] Every package that Step 2e records keeps its pin or its cap.

## Report

- [ ] The headings are exactly those of `update-report-template.md`, with
      `None.` in every empty section. At most 60 lines, 2 per bullet, and
      25 words per sentence.
- [ ] The result and every dependency's state follow the template's
      definitions, and the *Packages* counts match.
- [ ] Every updated or lowered dependency is under *Updated*. Every kept or
      lowered dependency is under *Constrained* or *Needs migration*.
- [ ] Every hold reason is a phrase from `update-rules.md`. Every link under
      *Needs migration* comes from its *Release notes* section.
- [ ] No command output, logs, or JSON listings. Every manifest path and
      package name in the report exists in the working tree.
- [ ] The report ends with its last section: no offer, question, or
      next-step suggestion.

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
