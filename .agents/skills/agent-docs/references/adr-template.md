# Writing an ADR

Read this before writing or editing an ADR under `docs/adrs/`.

## The file

- Name it `docs/adrs/NNNN-<kebab-title>.md`, with `NNNN` the next free
  number counted from `0000`.
- Keep that number for the life of the ADR. Never renumber an ADR.
- Add one row to `docs/adrs/README.md`, in number order, linking the file
  under its title.

## The sections

```markdown
# NNNN — Title

Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```

- **Title**: the decision in the present tense, never the problem.
- **Date**: the day the decision was taken. An edit sets it to the day of
  the change.
- **Context**: the problem in one paragraph, then one bullet per
  alternative turned down, each with the reason it lost.
- **Decision**: one paragraph with the reason the choice holds, and what it
  leaves out of scope. The rule it creates lives in an `AGENTS.md`.
- **Consequences**: the trade-offs and couplings no other place states.
  Leave the section out when there are none.

## An example

```markdown
# 0002 — Background jobs run in the queue package

Date: 2026-03-04

## Context

Three apps send email, and each retried in its own way, so a failed send
was lost in two of them. Turned down:

- A cron task per app: three retry policies, and no shared view of the
  sends that failed.
- The hosting provider's job runner: no local run, so a failure showed up
  first in staging.

## Decision

`packages/queue` owns every job: the apps enqueue, and the worker in
`apps/worker` runs the handlers. Scheduling a job from a request handler
stays out of scope.

## Consequences

A job payload crosses a package boundary, so its type lives in
`packages/queue` and both sides import it.
```

## Citing it

- Cite an ADR only from the rule it explains, at the end of that rule's
  bullet, as `(ADR 0002)`.
- Put the citation in the deepest `AGENTS.md` that holds the rule.
- State a short reason inline instead, with no ADR, when one clause carries
  it.

## Amending it

- Edit the ADR in place. Keep its number and its file name, and set `Date:`
  to the day of the change.
- Git keeps the history, so write no superseded-by line and add no status
  field.
- Rewrite the title and the `docs/adrs/README.md` row when the subject of
  the decision changes.

## Retiring it

- Delete the ADR when its reason no longer holds, or when code, a code
  comment, an `AGENTS.md`, a README or `docs/refs/` now shows it.
- Delete its row in `docs/adrs/README.md`.
- List every citation with `git grep -n 'ADR NNNN'`. Delete each one, and
  give the rule a short inline reason when its reason still holds.
- Leave the numbers of the other ADRs untouched.
