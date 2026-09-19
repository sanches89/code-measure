# Clarity rules

One rule per kind of ambiguity: the kind, how to find it, and the fix. A rule
of the project, recorded in Step 2d, wins over a rule here.

## Words

- **Two meanings for one word.** Find: a word whose usages point at two
  things, such as `context` for a section and for a context window. Fix:
  give each meaning its own term, with a qualifier or a new word, and never
  write the bare word again.
- **Two names for one thing.** Find: two words whose usages point at one
  thing, such as `server` and `tracker`, or one thing written two ways, such
  as `task file`, `task.md`, and `the task's file`. Fix: keep one name
  everywhere, the glossary's term when it has one.
- **Undefined term.** Find: a word that passes the entry test and has no
  glossary entry. Fix: use it the same way everywhere, and put it in the
  clarity report as a candidate. Never define it in the text.
- **Referent without a name.** Find: `it`, `this`, `that`, `the service`,
  `the config`, `the relevant tests`, `the usual place`, or a pronoun with
  two possible antecedents. Fix: write the name of the thing.
- **Vague quantity.** Find: `fast`, `slow`, `small`, `large`, `a few`,
  `soon`, `recent`, `reasonable`. Fix: write a number with a unit.
- **Banned word.** Find: `TBD`, `TBC`, `TODO`, `maybe`, `might`, `probably`,
  `possibly`, `perhaps`, `ideally`, `consider`, `could`, `should we`,
  `if needed`, `if necessary`, `as appropriate`, `as needed`, `etc`,
  `and so on`, `or similar`, `something like`. Fix: write the decision as a
  fact, or ask the user for it.
- **Scope word out of place.** Find: `only`, `every`, `alone`, `never`, or a
  count, placed where it covers more or less than intended: `only write the
  file in Step 8` for `write only the file`. Fix: place the word next to what
  it limits, and confirm the claim holds across the usages.

## Sentences

- **Two readings.** Find: a sentence that parses two ways, such as `the agent
  reads the task and the subtasks it names`, where `it` points at the task or
  at the agent. Fix: write the reading that holds, settled by research or by
  the user.
- **Alternative left to the reader.** Find: `either ... or`, `one of`,
  `A or B`, `option A / option B`, or `and/or` without grouping. Fix: write
  the one that holds. When each holds under its own condition, write each
  condition with its outcome.
- **Open question.** Find: a question mark outside quoted text and code,
  `if needed`, `as appropriate`, `should we`. Fix: write the answer as a
  fact, or ask the user.
- **Long sentence.** Find: more than 25 words, with a code span counted as
  one word. Fix: split it at a clause boundary, one idea per sentence.
- **Instruction not a command.** Find: an instruction in the passive voice
  (`the file is written`), with `should`, `must be`, or `is to be`, or as a
  statement of fact (`drafts go in the scratch directory`). Fix: write one
  command in the active voice with one action: `Write drafts in the scratch
  directory.`
- **Two actions in one sentence.** Find: an instruction with `and` or `then`
  joining two actions. Fix: one sentence per action, in order.
- **Mixed condition.** Find: `A and B or C` without grouping. Fix: write each
  condition as its own clause or list item, so that the grouping is explicit.
- **Double negative.** Find: `not un...`, `never fail to`, `do not forget
  to`. Fix: state the positive.

## Structure

- **Parallel items in prose.** Find: three or more clauses or steps joined
  in one sentence. Fix: write a list, one item per line. Keep short items,
  such as words, names, or paths, inline and separated by commas. Never nest
  a list only to split short items.
- **Order without numbers.** Find: steps whose order matters, written as
  prose or as an unordered list. Fix: a numbered list in execution order.
- **Example that does not match.** Find: an example that contradicts the rule
  it illustrates, or that names a thing that does not exist. Fix: correct the
  example against the code or the rule.
