# Task template

Fill every section and replace every `<placeholder>`. Keep the headings exactly
as written. The task becomes the body of one item or one `task.md` file. The
`breaking-down-tasks` skill reads this same format later to fill the Subtasks
section.

Rules for filling:
- Write facts in the present tense. Name real things: paths with line
  numbers, symbols, endpoints, tables, environment variables, commands. Mark
  a file that does not exist yet as `(new)`.
- Write quantities as numbers with units.
- `a | b` on a template line means: write a or b, never both.
- *Approach* says what changes where. *Decisions* holds the rules and values
  the change follows. Put each fact in one section only.
- *References* lists the sources for reviewers. The implementing agent never
  opens them: write every fact a source settles in *Decisions* or *Context*
  too.

---

```markdown
# <Title. Imperative, under 80 characters. Example: Add retry to webhooks>

## Summary

<Two or three sentences: what changes and why. No history of the discussion.>

## Success criteria

- <Observable, binary outcome. Example: POST /webhooks/payment returns 200
  after a transient upstream 503 that recovers within 3 attempts.>
- <...>

## Scope

### In scope

- <Deliverable.>
- <...>

### Out of scope

- <Adjacent topic. Not part of this task.>
- <... or the single word: None.>

## Approach

- <Path and symbol, then its behavior after the change. Example:
  src/payments/service.ts (PaymentService.send) retries the HTTP call per
  RetryPolicy and rethrows the last error after the final attempt.>
- <New component. Example: src/payments/retry-policy.ts (new) exports
  RetryPolicy.next(attempt), which returns the delay in ms or null.>
- <...>

## Decisions

- <Rule or value. Example: Backoff starts at 500 ms, doubles per attempt,
  stops after 5 attempts.>
- <Convention. Example: New tests live in tests/payments/ and use the
  WebhookFactory fixture from tests/factories.ts:12.>
- <...>

## Context

- <Fact with its origin. Example: Webhook handling lives in
  src/payments/webhooks.ts:41 (handlePaymentWebhook).>
- <Related item. Example: Related to PAY-212, which added the endpoint.>
- <Library fact with version. Example: axios 1.7 exposes retry only through
  interceptors.>
- <Commands. Example: build `npm run build`, tests `npm test -- tests/payments`,
  lint `npm run lint`.>
- <...>

## References

- <Source outside the repository and the tracker: name, URL, and what it
  settles. Example: Checkout design, frame "Retry banner",
  https://claude.ai/design/p/checkout. Settles the banner copy and layout.>
- <... or the single word: None.>

## Subtasks

None.

## Verification

1. <Exact command or manual step that proves a success criterion.>
2. <...>
```
