# Job prompt template

The prompt is everything a job receives besides the repository. Replace
every `<placeholder>` and keep every other line. A job that misses one
commits in the wrong place or returns more than the work report.

Rules for filling:
- `a | b` on a template line means: write a or b, never both.
- Copy a fact word for word from the plan. Name real things: paths,
  symbols, commands, identifiers.
- The single word `None.` under a heading with nothing to list.

---

## Prompt

```
Use the implementing-tasks skill on the target below and return its work report.

Target: <task file path | subtask file path | item identifier and URL>
Working tree: <absolute path of the tree>
Branch: <branch name> | none: no git repository

Make every change and run every command in the working tree above.

Commit: <one commit for this target on the branch above, by the project's
conventions, when the result is done | none: no git repository>
Never push, open a pull request, change an item's status, or comment on
an item.

Facts from earlier subtasks of this task. Each holds over the task text:
- <job number>: <fact, copied from a work report>
- <... | None.>

Ask nothing. When a decision changes the work and research cannot settle
it, make no further change and return the work report with the result
blocked and the decision under Blocked by.

Return the work report as the final message and nothing else.
```
