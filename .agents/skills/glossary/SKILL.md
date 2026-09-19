---
name: glossary
description: Use when the user wants a project's glossary or GLOSSARY.md created, updated, cleaned up, or audited, or says the documents use one word for two things, two words for one thing, or undefined terms. Not for rewriting the documents themselves.
license: MIT
argument-hint: <glossary path | files to cover | words to define>
---

# Glossary

Find the words that a project's documents use with two readings and that no
other word settles. Write the glossary that defines each once. Write only
the glossary. Report where other documents disagree with it, and rewrite
them with the `unambiguity` skill when it is available.

The glossary is `GLOSSARY.md` at the repository root, unless the user names
another path. The document set is the files the glossary covers. A term is a
word or phrase with a glossary entry. A candidate is a word research found
that has no entry yet. A usage is one occurrence of a word in the document
set, as path and line. A restatement is a glossary entry copied into another
document, such as a `## Terms` section.

## Hard rules

1. **Read-only on the project.** Write, or delete, only the glossary, in
   Step 7. Write drafts in a scratch directory outside the repository
   (in Claude Code, the scratchpad directory).
2. **Never ask what research can answer.** Consult the document set, the
   code, and the existing glossary first.
3. **Never assume.** When a definition changes the glossary and research
   cannot settle it, ask the user.
4. **Never edit another document yourself.** A usage that disagrees with
   the glossary goes in the glossary report. Only the `unambiguity` skill
   rewrites a document, when Step 7 invokes it.
5. **Write nothing before the user approves the full glossary text**
   (Step 6).

## Workflow

### Step 1: Restate the target

Take the glossary path, the document set, and the words to define from the
invocation text or the conversation. Without a path, use `GLOSSARY.md` at
the repository root. Without named files, use every Markdown file tracked by
git, minus the files the user excludes.

When the invocation text starts with `from <skill name>:`, that skill
invoked this run. Take the glossary path after `glossary`, the files after
`files`, and the words after `words`. The document set is the set named in
the glossary's header plus those files, or those files alone when no
glossary exists. Step 7 then invokes no skill.

Write one sentence: *The glossary at <path> covers <document set>.* Name
the files, or the rule that selects them. Ask the user to confirm or correct
it before any research.

### Step 2: Research

**2a. Existing glossary.** When the glossary exists, read it in full. Record
every term, its definition, and its section.

**2b. Document set.** Read every document in full. Use a read-only subagent
for broad sweeps when the agent offers one (in Claude Code, the `Explore`
subagent). Record, with path and line:
- every candidate:
  - a word whose usages point at two things;
  - a word used in a sense that differs from its common sense or from its
    sense in the project's field. Count it only at a usage whose sentence
    does not settle the sense;
  - a word that a `## Terms`, `## Definitions`, or `## Glossary` section of
    a document defines;
  - every word named in the invocation text or by the user;
- every synonym pair: two words whose usages point at one thing;
- every usage of every candidate and of every existing term;
- every restatement: a `## Terms`, `## Definitions`, or `## Glossary`
  section, and every bullet `- **X**: ...` outside the glossary.

**2c. Code.** Search the project's code for each candidate. Record the
identifier that carries the word and what the code does with it, so that
the definition matches the code, not the prose.

**2d. Findings.** Run the entry test on every candidate and every existing
entry. Give a word an entry only when all three hold:
- at one usage at least, a reader can take the word in two ways, and the
  two readings lead to different actions;
- no word or phrase with one reading fits every usage;
- the sentence around that usage does not settle the reading.
A word that fails the second condition gets a rename in the glossary
report, never an entry. A word that fails the first or the third gets
nothing.

Write each finding with its usages:
- a conflict: one word used for two things;
- a synonym pair;
- a candidate that passes the entry test;
- an entry, in the glossary or in a restatement, that fails the entry test,
  with the condition it fails;
- a fact of an instruction inside a definition: a path, a placeholder, a
  format, a list of allowed values, a section list, or a condition, with
  the document and line that use it;
- an unused entry: a glossary term that no document uses;
- a mismatch: a restatement whose text differs from the glossary;
- a weak definition: one that breaks a writing rule of Step 4.

**2e. Research notes.** Write a private file in the scratch directory with
two parts:
1. *Facts*: every candidate and every finding, with its path and line.
2. *Open decisions*: every decision research did not settle, with the
   entries it affects.

### Step 3: Interview

Order the open decisions: conflicts first, then synonym pairs, then entries
to remove, then meanings research did not settle, then sections.

For each open decision:
- State it in one sentence, with the usages that depend on it.
- Give 2 to 4 options grounded in research. For a conflict, offer a
  qualifier per thing and a new word per thing: `backend component` and
  `frontend component`, never `component`. For a synonym pair, offer each
  word as the one name. For the entries to remove, the entries of 2d that
  fail the entry test or are unused, ask one question. It lists each with
  its condition or the word `unused`: remove all, some by name, or none.
- Name the option you recommend.

After each answer, record the decision as a fact in the research notes and
add every new decision the answer creates.

Never ask about:
- a candidate that fails the entry test;
- a meaning the documents or the code settle;
- a word with one reading and one name;
- the wording of a settled meaning.
Continue until no open decision remains.

### Step 4: Write the glossary

Read `references/glossary-template.md` now and fill it, in the scratch
directory, with the terms that pass the entry test. Writing rules:
- Start a definition with a noun phrase that names the kind of thing:
  `a user assigned the patient role in the app`, never `handles patients`.
- Say what the term is, never how it works, never with its own term, and
  never with a banned word. The grep helper of
  `references/quality-checklist.md` lists the banned words.
- Write at most two sentences of at most 25 words: what the term is, then a
  boundary or an example.
- Put no fact of an instruction, as 2d lists them, in a definition.
- Give every term one definition, and no definition two meanings.
- Write the retired word of a synonym pair, and the words of a settled
  conflict, in the glossary report, not in the glossary.

When no term passes the entry test, write no draft. Go to Step 6 with the
glossary report alone and ask whether the user confirms an empty glossary.
On confirmation, Step 7 deletes an existing glossary and writes no new one.

### Step 5: Quality check

Run every check in `references/quality-checklist.md`, grep helpers
included, over the draft. Fix every failure. When a failure needs a
decision, return to Step 3 for that decision, then run the checks again.

### Step 6: Approval

Show the complete glossary in chat, then the glossary report as it stands.
Ask whether the user approves the glossary as written or wants a change.
Apply each change, run Step 5 again, and ask again until the user approves.

### Step 7: Save

Write the approved glossary to its path, unchanged. When Step 4 found no
term, delete the existing glossary instead.

Then rewrite the documents that disagree with the `unambiguity` skill when
all of these hold:
- the glossary report holds at least one disagreement;
- a skill named `unambiguity` is available to the agent;
- no other skill invoked this run.
Ask one question: which documents with disagreements to rewrite now. Offer
every listed document, the documents the user names, and none. For each
chosen document, in the order listed, invoke the `unambiguity` skill
(in Claude Code, with the `Skill` tool) with the invocation text
`from glossary: <file path>`. Wait for it to finish: it shows its rewrite,
asks its own approval, and prints its clarity report.

Finish with the glossary report:
- *Added*: each new term.
- *Changed*: each term whose name or definition changed, with the old text.
- *Removed*: each term removed, with the condition of the entry test it
  failed, or the word `unused`.
- *Renamed*: each word replaced by a word with one reading, with the new
  word and every usage of the old one.
- *Facts to place*: each fact taken out of a definition, with the document
  and line that use it. The user places these: the `unambiguity` skill adds
  no fact.
- *Disagreements*: every usage in another document that disagrees with the
  glossary, with its path and line and the change that settles it. Add the
  word `rewritten` when the `unambiguity` skill rewrote that document.
Ask nothing else.
