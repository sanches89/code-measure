---
name: creating-tasks
description: Writes one task from an idea, feature, bug, or refactor, researched in the code and settled in an interview. Use when the user wants work explored, planned, scoped, or turned into a task, ticket, issue, spec, or plan before implementation, even from a one-line idea or a vague remark that something should change.
license: MIT
compatibility: The line count needs cloc on PATH, or Node.js with npx, Perl 5, and network access on the first run. A missing tool leaves the count to the agent and never blocks the task.
argument-hint: <idea>
---

# Creating tasks

Turn an idea into a task that a person or an agent can execute without asking
a question. Record decisions, not options. The implementing agent asks
nothing and stops on a missing fact: put every fact it needs in the task.

## Hard rules

1. **Read-only on the project.** Write only the task file, in Step 8. Write
   drafts in a scratch directory outside the repository (in Claude Code, the
   scratchpad directory), written `<scratch-dir>` in paths. A draft inside
   the repository ends up committed beside the code.
2. **Never ask what research can answer.** Consult code, docs, tests, and
   connected tools first. A question the code answers costs the user time
   and invites a guess.
3. **Never assume.** When a decision changes the task and research cannot
   settle it, ask the user. An assumed decision becomes a wrong fact that
   the implementing agent follows without noticing.
4. **Write nothing outside the scratch directory before the user approves
   the full task text** (Step 7). The next skill treats a saved task as
   settled.
5. **Only the idea goes in.** The task holds what the restated idea needs
   and the *Out of scope* entries of Step 4, nothing else. A question or
   remark from the user on any other topic gets an answer in chat and no
   line in the task. When it deserves a task of its own, say so in chat
   and write nothing about it in the task. A stray line in the task
   becomes scope for the implementing agent.

## Workflow

### Step 1: Restate the idea

Take the idea from the invocation text or the conversation. Without one, ask
for it first. Write one sentence: *The idea is to <change> so that
<outcome>.* Ask the user to confirm or correct it before any research.

### Step 2: Research

**Subagents.** When the agent offers subagents, run in one every read whose
whole product is the facts the step records. In Claude Code, that is the
`Agent` tool, with the `Explore` subagent for reads. Run in one every
command whose output the step reduces to a result. Give the subagent the
question, the paths, and the facts to return. It returns only those facts,
each with path and line. The context window then holds those returns, not
the files, and stays small. Without subagents, follow the step yourself and
keep only what it names.

**2a. Codebase.** Read the code the idea touches, not only file names.
Record, with paths and line numbers:
- the entry points, modules, and symbols the change touches or calls;
- how the project builds similar features: patterns, naming, error handling,
  configuration;
- the test conventions and where tests for the touched areas live;
- the build, lint, and test commands.

**2b. Project docs.** Read README, CLAUDE.md, AGENTS.md, CONTRIBUTING,
`docs/`, and ADRs. Record the conventions and constraints that affect the
idea. Then find `<tasks-dir>` and read the tasks, plans, and specs in it
that touch the idea.

**Tasks directory.** `<tasks-dir>` is the folder that holds the task
folders. It is the first of these that exists:
1. the folder that the request or the conversation names;
2. the folder that README, CLAUDE.md, AGENTS.md, CONTRIBUTING, or
   `docs/README.md` names as the place for tasks, plans, or specs;
3. the parent of a task folder: a folder named `###-<task-slug>`, three
   digits, a hyphen, and a slug, that holds a `task.md`, anywhere in the
   repository outside `node_modules`, `.git`, and `vendor`. With several
   parents, the shortest path, then the first in alphabetical order;
4. a folder named `tasks`, `plans`, or `specs` that holds a `.md` file at
   any depth. It sits at most three levels below the repository root,
   outside `node_modules`, `.git`, and `vendor`. With several, the
   shortest path, then the first in alphabetical order;
5. else `<scratch-dir>/tasks/`.

**2c. Tracker and MCP servers.** Find the tracker by the rule below. List
the other MCP tools of the agent (in Claude Code they are deferred: search
them with `ToolSearch` for `context7`). Then:
- **Tracker**: search for items related to the idea and record their
  identifiers. Record the team, project, or board that the docs name, else
  the ones the tracker offers, and the fields an item requires. Step 3
  decides the destination among them.
- **Context7**: for every external library the idea depends on, fetch the
  documentation of the version pinned in the manifest or lockfile. Record
  the API facts the task relies on.
- **Other MCP servers**: use them when they hold facts the task needs.
- **External sources**: every design, document, or wiki page outside the
  repository and the tracker that the user gives or research finds. Read
  each through a connected MCP server, else a web fetch. Record its facts,
  and its name and URL for *References*. When nothing reads it, ask the
  user for the facts it settles.
Never ask the user to install or connect anything.

**Tracker.** The tracker is the issue tracker the project uses, reached
through an MCP server or through `gh`, the GitHub CLI. Find it once, in
this order, and take the first that applies:
1. the tracker that README, CLAUDE.md, AGENTS.md, CONTRIBUTING, or
   `docs/README.md` names, when an MCP server or `gh` reaches it. When
   the docs name one that nothing reaches, no tracker is connected;
2. the tracker of an MCP server whose tools read and write issues. List
   the MCP tools of the agent (in Claude Code they are deferred: search
   them with `ToolSearch` for
   `issue ticket project linear jira notion asana github`). With several,
   the first listed;
3. GitHub Issues through `gh`, when `git remote get-url origin` prints a
   `github.com` URL and `gh auth status` exits 0. Then
   `gh issue view <number> --comments` reads an item,
   `gh api repos/{owner}/{repo}/issues/<number>/sub_issues` lists its
   children, and `gh issue create`, `gh issue edit`, `gh issue comment`,
   and `gh issue close` write. A POST with `gh api -X POST` to that
   `sub_issues` path with `-F sub_issue_id=<id>` links a child, where
   `<id>` is the `id` that `gh api repos/{owner}/{repo}/issues/<child>`
   prints. A closed issue is in a completed status, and `gh` has no other
   status;
4. else no tracker is connected.

**2d. Research notes.** Write a private file in the scratch directory with
two parts:
1. *Facts*: each with the path and line, identifier, or URL it came from.
2. *Open decisions*: every decision research did not settle, with the task
   section it affects.

### Step 3: Interview

Order the open decisions: scope first, then behavior, then technical
choices, then delivery details. Ask delivery details only when the task goes
to the tracker by the rule of Step 8: the team, project, or board, and the
required field values research did not settle.

For each open decision:
- State it in one sentence, with what in the task depends on it.
- Give 2 to 4 options grounded in research:
  `Reuse PaymentService.retry() in src/payments/service.ts:88`, never
  `reuse existing code`.
- Name the option you recommend.

After each answer, record the decision as a fact in the research notes and
add every new decision the answer creates. Read an external source the
answer gives as Step 2c states. When the answer introduces an
adjacent topic, one a reader would expect in this task, ask one question:
in scope, or under *Out of scope*. Never expand or drop it in silence.

When the user asks a question or makes a remark on any other topic, answer
it in chat and record nothing from it: not in the research notes, not in
the task, not under *Out of scope*. When it deserves a task of its own, say
so in chat once, then go on with the interview.

Never ask about what the code, the docs, or a project convention settles:
follow the convention and record it as a decision. Never ask about a
preference that changes nothing in the task, and never an open-ended
question such as "anything else?". Continue until no open decision remains.

### Step 4: Scope lock

Show two lists in chat and ask the user to confirm or change them. Repeat
until the user confirms:
- **In scope**: every deliverable.
- **Out of scope**: each adjacent topic a reader would expect in this task,
  as `<topic>. Not part of this task.`, or `None.`

### Step 5: Write the task

Read `references/task-template.md` now and fill every section, in the scratch
directory. Writing rules:
- Write decisions as facts:
  `Retries use exponential backoff from 500 ms, at most 5 attempts.`, never
  `We decided that...` or `Retries should probably...`.
- In *Approach*, name every component that changes, with the path and symbol
  verified in Step 2, and its behavior after the change.
- Write success criteria that are binary: someone else can answer yes or no.
- In *Verification*, list the exact commands or manual steps that prove
  every success criterion.
- In *References*, list every external source of Step 2c with its URL and
  what it settles, else `None.`
- Write the single word `None.` in *Subtasks*.
- Include code only when its exact shape is a decision: a schema, an
  interface, a CLI flag, an endpoint signature. Never implementation code.
- Add no section beyond the template: no Risks, Considerations,
  Alternatives, Future work, Nice to have, or Notes.
- Add no estimate, priority, or timeline unless the user asked for them.
- Make every line serve the restated idea or an *Out of scope* entry. Write
  no remark or question from the conversation on another topic, and no
  mention of another task to create.
- Write at most 25 words per sentence, and only lines the implementing agent
  needs.

### Step 6: Quality check

Run every check in `references/quality-checklist.md`, grep helpers included,
over the draft. Fix every failure. When a failure needs a decision, return to
Step 3 for that decision, then run the checks again.

### Step 7: Approval

Show the complete task in chat and ask whether the user approves it as
written or wants a change. Apply each change, run Step 6 again, and ask again
until the user approves.

### Step 8: Save

Save to a file when no tracker is connected, or when the user asked for a
file at any point. Otherwise save to the tracker of Step 2c. Never ask which.

**To the tracker**: create one item at the destination of Step 3, with the
task title as title and the approved task, unchanged, as body.

**To a file**: `<tasks-dir>/###-<task-slug>/task.md`, with `<tasks-dir>`
from Step 2b. When `<tasks-dir>` already holds a folder with the same
`<task-slug>` under any number, ask one question: overwrite its `task.md`
keeping its number, or write a new folder with a new number. Write the
approved task, unchanged.

**Numbering rule.** `###` is a zero-padded three-digit sequence from `001`: the
next free number across every entry of `<tasks-dir>` whose name starts with
three digits. `<task-slug>` is the task title in kebab-case: lowercase ASCII
letters and digits, every other run of characters replaced by one hyphen, cut to
60 characters, with no leading or trailing hyphen. The `breaking-down-tasks`
skill shares this layout and adds `###-<subtask-slug>.md` files inside the task
folder.

### Step 9: Size check

Read `references/line-count.md` now. Estimate the code lines the task adds,
removes, or modifies, outside the test locations recorded in Step 2a. Count
the files it deletes or rewrites with the count tool instead of an estimate.
When the estimate is above 500 code lines, show this warning in chat, with
the estimate in place of `<n>`:

```text
Heads up: this task changes about <n> code lines. Reviews go best under
500. The breaking-down-tasks skill splits it into subtasks that aim at 500 code
lines each.
```

Finish with one line: the item's identifier and URL, or the path of the task
file, absolute when outside the repository. Ask nothing else.
