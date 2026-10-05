# Characterization tests

Read this file in Step 6. A characterization test records what the code does
today, so that a refactoring that changes behavior fails a test. The review
names the test cases and the seam in the subtask; the implementer writes the
tests. A convention of the project, from Step 3c, replaces a rule here:
its framework, test location, naming, fixtures, and helpers. Never name a
second framework or style beside the project's.

## What to record

- Record the behavior of the code the subtask changes, and nothing beyond it.
- Test through the public interface that reaches the code: what it returns,
  what it changes, what it raises. Never test how it does it.
- Name one test case per branch the refactoring touches:
  - the normal path;
  - the boundaries of each input: empty, zero, one, many, the minimum, the
    maximum, a missing value;
  - every error the code raises, one test per error.
- Name each test case by the unit, the condition, and the result it records,
  in the project's naming style. Example:
  `parseRange returns an empty list for "5-1"`.
- Run or read the current code. Write its result into the test case name as
  a literal, right or wrong. Put a result that looks wrong under the task's
  *Out of scope* and keep the test case.
- Before merging clones, record the behavior of every copy. Two copies that
  differ in one branch are two behaviors.

## Reaching the code

- Reach a private function through the public function that calls it.
- Replace only system boundaries with a test double: network, clock,
  filesystem, database, external services, randomness.
- Name the project's own fakes, factories, and helpers before a new test
  double.
- Use a seam the code already has: a parameter, a constructor argument, an
  injected dependency, a module the framework lets a test replace.
- Add a seam only from the safe set, and make it a subtask of its own,
  placed first. Take the first of these that reaches the code:
  1. Parameterize Function: the collaborator becomes a parameter with a
     default equal to the current one;
  2. Parameterize Constructor: the same, as a constructor argument stored
     in a field;
  3. Extract Function around the call to the system boundary, so that a
     test replaces the one function.
  The seam stays in the code after the tests: it is the injection point
  that the *Design* entries of `smell-catalog.md` use.
- Drop the entry when no seam reaches the code. Record the reason under the
  task's *Out of scope*.

## Rules the subtask restates

Write these into the Context section of every subtask that names a
characterization test:
- One behavior per test, with the expected value as a literal from the
  unchanged code. Never compute the expected value with the same logic as
  the code under test.
- Assert the specific outcome: the value, the state, the raised error with
  its type and message. `does not throw` alone proves nothing.
- No real network, no real clock, no random values without a fixed seed, no
  sleeping, no files outside a temporary folder.
- Each test passes on the unchanged code and fails once when the asserted
  behavior is broken. The implementer breaks the behavior by hand and
  restores it. When the project configures mutation testing, name its
  command here for a `high` risk subtask instead. Limit the command to the
  subtask's files, as *Mutation scope* in `measurement-tools.md` states.
- Every test holds at least one assertion.
- The characterization tests stay in the change, as the proof of the
  refactoring and the safety net of the next one.
- A characterization test changes only in an import, a path, or a symbol
  name that a subtask moves or renames. Its assertion never changes.
