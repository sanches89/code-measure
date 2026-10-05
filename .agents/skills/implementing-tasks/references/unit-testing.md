# Unit testing

Rules for every test this skill writes, in any language and framework. A
convention of the project, as recorded in Step 4e, beats a rule here. Never
add a second framework or style beside the project's.

## What to test

- Test behavior through the public interface of the unit: what it returns,
  what it changes, what it raises. Never test how it does it.
- Give every criterion that code can observe at least one test.
- Give every branch the change adds a test:
  - the normal path;
  - the boundaries of each input: empty, zero, one, many, the minimum, the
    maximum, a missing value;
  - every error behavior the target names, one test per error.
- Give a bug fix a regression test that fails on the code before the fix.

## What not to test

- A private function, directly. Reach it through the public interface.
- The behavior of a third-party library, the framework, or the language.
- Generated code.
- The same behavior twice at the same level.

## Structure of a test

- Test one behavior per test, so that a test has one reason to fail.
- Write three parts, in this order: arrange the inputs, act by calling the
  unit once, assert the outcome.
- Name the test by the unit, the condition, and the expected result, in the
  project's naming style:
  `RetryPolicy.next returns null after the fifth attempt`.
- Write no loops and no conditionals inside a test. Use the framework's table
  or parameterized form for many inputs of one behavior.
- Write expected values as literals. Never compute the expected value with the
  same logic as the code under test.
- Use the project's fixtures and factories for shared setup. Show in the test
  every value that its assertion depends on.

## Determinism

A test gives the same result on every run, on every machine, in any order:
- no dependence on the order of tests or on state another test left behind;
- no real network, no real clock, no random values without a fixed seed;
- no files outside a temporary folder that the test creates and removes;
- no sleeping and no waiting on real time. Advance a fake clock instead;
- no dependence on environment variables, locale, or time zone that the test
  does not set itself.

## Test doubles

- Replace only system boundaries: network, clock, filesystem, database,
  external services, randomness.
- Use the project's own fakes, factories, and helpers before writing a new
  test double.
- Never replace the unit under test or any part of it.
- Use the real collaborator when it is fast and deterministic.
- Assert on a call to a test double only when the call itself is the
  behavior, such as `sends exactly one email`.

## Assertions

- Assert the specific outcome: the value, the state, the emitted event.
  `does not throw` alone proves nothing.
- In an error test, assert the error type and its message or code.
- Assert only what the behavior under test decides. Never assert on
  incidental details such as log text, field order, or internal counters.
- Write no snapshot test for logic. Use a snapshot only for large rendered
  output, and only where the project already uses snapshots.

## A test must be able to fail

- Run each new test before the code exists and confirm it fails for the
  expected reason: the missing behavior, never a mistake in the test.
- Make a test for a refactor pass before and after the refactor. Break the
  asserted behavior once, see the failure, and restore the code.
- Give every test at least one assertion.

## Kind of test

- Write unit tests by default.
- Write an integration test only in two cases: the target names one, or a
  criterion has no unit-level proof and the project already has integration
  tests for that area.
- A coverage threshold the project enforces is part of the test command and
  holds for the change. Never write a test only to raise a number.

## Existing tests

- Edit an existing test only for a behavior the target changes, or for an
  import, path, or symbol name it renames or moves. List the file under
  *Changes* in the work report.
- Never delete, skip, or loosen a test to make a run pass.
- Leave alone a test that already failed in the baseline and list it under
  *Affects other work*, unless a criterion covers it.
