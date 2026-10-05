# Update report template

Sections: Update report.

The update report is all the user keeps from a run. Make every line a fact
that changes what the user does next. Keep the headings exactly as written.
Replace every `<placeholder>`.

Rules for filling:
- At most 60 non-blank lines, 2 lines per bullet, and 25 words per sentence.
- Present tense. Name real things: manifest paths, package names, versions,
  check commands, files.
- `a | b` on a template line means: write a or b, never both.
- The single word `None.` in a section with nothing to say. No section
  beyond the ones below.

Every dependency with a rewritable range has exactly one state:
- **updated**: its range now names its candidate version;
- **lowered**: its range changed, to a rung below its candidate version;
- **kept**: its range is the current range, and the run recorded a hold
  reason for it;
- **up to date**: it has no candidate version.

What each section keeps:
- **Result**: `done` when Step 7 passes on every install root, or when
  Step 5 produced no plan entry. `partial` when Step 7 passes on at least
  one install root and at least one other was restored from the baseline
  copy. `blocked` in every other case.
- **Request**: the paths and package names of Step 1, or `all`, with the
  level and the cooldown.
- **Install roots**: the count of install roots and of orphan manifests.
- **Packages**: the count of dependencies in each state, the updated count
  split by bump kind.
- **Checks**: `pass` when Step 7 passes on every install root.
  `install only` when every install root is install-only. Otherwise `fail:`
  with each check command that fails in Step 7 and passes in the baseline
  results.
- **Node version**: `<node-version>` and its Node version source.
- **Updated**: one bullet per manifest with an updated or lowered
  dependency, naming each with its current range and its new range. With
  more than 12 in one manifest, name those with bump kind `major` and count
  the others.
- **Constrained**: one bullet per kept or lowered dependency whose hold
  reason is `engines.node`, `peer of`, `@types/node major`, `override`,
  `pinned by`, `cooldown`, or `deprecated`.
- **Needs migration**: one bullet per kept or lowered dependency whose hold
  reason is `check:` or `verify:`, with the release notes link from
  `update-rules.md`.
- **Deprecated**: one bullet per dependency whose current version, or whose
  `latest` dist-tag version, carries a deprecation message, quoted in one
  line.
- **Left alone**: one bullet per manifest, naming each range or field with
  its kind from `update-rules.md`.
- **Unverified**: one bullet per orphan manifest, with the count of ranges
  set there.

What the report leaves out:
- the steps taken, and attempts that failed;
- command output, logs, stack traces, and the JSON files of Step 4;
- the request restated;
- praise, apologies, offers, questions, and next-step suggestions.

---

## Update report

```markdown
# Update report: <repository or paths in a few words>

**Result:** done | partial | blocked
**Request:** <paths and package names | all>, level <latest | minor | patch>,
cooldown <days> days
**Install roots:** <number>, with <number> orphan manifests
**Packages:** <number> updated (<number> patch, <number> minor, <number>
major), <number> lowered, <number> kept, <number> up to date
**Checks:** pass | install only | fail: <name of each check command>
**Node version:** <version> from <Node version source>
**Commits:** none | <short hashes, in commit order>

## Updated

- `<manifest path>`: <name> <current range> to <new range>, <name>
  <current range> to <new range>
- <...>

## Constrained

- <name> in `<manifest path>`: kept <range> | set <range>, candidate
  <version>. <hold reason>
- <... or the single word: None.>

## Needs migration

- <name> in `<manifest path>`: kept <range> | set <range>, candidate
  <version>. <hold reason>. <release notes link>
- <... or the single word: None.>

## Deprecated

- <name> in `<manifest path>`: <deprecation message in one line>
- <... or the single word: None.>

## Left alone

- `<manifest path>`: <name> (<kind>), <name> (<kind>)
- <... or the single word: None.>

## Unverified

- `<manifest path>`: no lockfile. <number> ranges set without an install.
- <... or the single word: None.>
```
