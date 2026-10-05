# Smell catalog

Sections: Duplication; Size; Names; Conditionals; Data; Coupling; Dead weight;
Comments; Design; Agent-written code; Legibility; Tests.

Every smell this skill reports. A function is a function, a method, or a
procedure. A module is a class, a file, or a package. A system boundary is the
network, the clock, the filesystem, a database, an external service, randomness,
or the process environment. Skip an entry that the language of the code has no
form for. Each entry gives the **Signal** that shows the smell, the
**Refactoring** that removes it, and the case to **Leave it**. An entry with
**Report** in place of a refactoring names a behavior change: it goes under the
task's *Out of scope*, for the `creating-tasks` skill. The limits named here are
the defaults of `measurement-tools.md`; the project's own limits replace them.
The scan script of Step 4 lists the signals that name a kind, as `path:line`. A
signal is a line to read, never a finding.

## Duplication

- **Duplicated code**
  - Signal: an entry in `duplication.top`, or the same statements in two
    places.
  - Refactoring: Extract Function. Then Move Function to a shared module when
    the copies live in two modules.
  - Leave it when: the copies change for different reasons, or fewer than
    three copies exist and they state no single rule.
- **Repeated condition**
  - Signal: the same `switch` or `if` chain over one value in three places.
  - Refactoring: Replace Conditional with Lookup Table, or Replace Conditional
    with Polymorphism in a language with types that dispatch.
  - Leave it when: the chain exists once, or the branches share nothing.
- **Parallel modules**
  - Signal: two modules with the same functions under different names.
  - Refactoring: Rename until the names match, then Extract Module for the
    shared part.
  - Leave it when: two teams or two external systems own them.

## Size

- **Long function**
  - Signal: `length` above its limit of 50 lines, or a block that needs a
    comment to say what it does.
  - Refactoring: Extract Function, Decompose Conditional, Split Loop.
  - Leave it when: the function is one flat list of steps with no branch,
    such as a configuration table or a route list.
- **Complex function**
  - Signal: `ccn` above its limit of 10, or nesting deeper than 3 levels.
  - Refactoring: Replace Nested Conditional with Guard Clauses, Decompose
    Conditional, Extract Function.
  - Leave it when: the branches are one flat `switch` that maps values to
    results.
- **Long parameter list**
  - Signal: `params` above its limit of 4.
  - Refactoring: Introduce Parameter Object, Preserve Whole Object, Remove
    Flag Argument.
  - Leave it when: the signature is part of the contract.
- **Large module**
  - Signal: a file at the head of `hotspots.top`, or a module whose functions
    fall into groups that share no data.
  - Refactoring: Extract Module, Move Function.
  - Leave it when: the file is a generated index or a list of declarations.

## Names

- **Mysterious name**
  - Signal: a name that needs the body to be understood, an abbreviation, a
    name with a type in it, or two names for one concept.
  - Refactoring: Rename.
  - Leave it when: the name is part of the contract, or the domain uses that
    exact word.
- **Misleading name**
  - Signal: a name that says less or more than the code does, such as a
    `get` that writes.
  - Refactoring: Rename. Then Separate Query from Modifier when the function
    does both.
  - Leave it when: the name is part of the contract.

## Conditionals

- **Nested conditional**
  - Signal: an `else` branch that holds the main path, or 3 levels of nesting.
  - Refactoring: Replace Nested Conditional with Guard Clauses.
  - Leave it when: both branches are normal paths of equal weight.
- **Complex condition**
  - Signal: a condition with three or more operators, or a negated compound.
  - Refactoring: Extract Variable, or Extract Function with a name that
    states the rule.
  - Leave it when: the condition is a standard idiom of the language.
- **Flag argument**
  - Signal: a boolean or an enum parameter that picks between two bodies.
  - Refactoring: Remove Flag Argument: one function per value.
  - Leave it when: the flag passes through to the contract unchanged.

## Data

- **Data clump**
  - Signal: the same three or more values passed or stored together in three
    places.
  - Refactoring: Introduce Parameter Object, Extract Module for the group.
  - Leave it when: the values only meet by accident, such as `x` and `y` of
    unrelated things.
- **Primitive obsession**
  - Signal: a string or a number that carries rules, such as a currency
    amount, a range, or an identifier that gets parsed in many places.
  - Refactoring: Replace Primitive with Object, in the form the language and
    the project use for value types.
  - Leave it when: the value has no rule beyond its type.
- **Mutable shared data**
  - Signal: a global or a module-level variable written from more than one
    function.
  - Refactoring: Encapsulate Variable, then narrow who writes it.
  - Leave it when: the project's framework requires that form.
- **Temporary field**
  - Signal: a field set only during one operation and empty otherwise.
  - Refactoring: Extract Module for the operation, or turn the field into a
    local variable or a parameter.
  - Leave it when: a serialization format requires the field.

## Coupling

- **Feature envy**
  - Signal: a function that reads more data of another module than of its
    own.
  - Refactoring: Move Function, or Extract Function and move the part.
  - Leave it when: the function is a mapper or a serializer between the two
    modules by design.
- **Shotgun surgery**
  - Signal: one kind of change that touches many modules, shown by files that
    change together in the git history.
  - Refactoring: Move Function and Move Field until one module holds the
    rule.
  - Leave it when: the modules are layers that the architecture keeps apart.
- **Divergent change**
  - Signal: one module that changes for unrelated reasons, shown by a hotspot
    whose commits cover different subjects.
  - Refactoring: Extract Module, one per reason.
  - Leave it when: the module is a composition root that wires the others.
- **Message chain**
  - Signal: a caller that walks `a.b().c().d()` through three objects it does
    not own.
  - Refactoring: Hide Delegate, or Extract Function and Move Function toward
    the data.
  - Leave it when: the chain is a fluent builder or a query interface.
- **Middle man**
  - Signal: a module whose functions only forward to another module.
  - Refactoring: Remove Middle Man, Inline Function.
  - Leave it when: the module is a boundary that the architecture requires,
    such as an adapter to an external system.
- **Dependency cycle**
  - Signal: two modules that import each other, directly or through a third.
  - Refactoring: Extract Module for the shared part, then Move Function.
  - Leave it when: the language and the project treat the two files as one
    module.

## Dead weight

- **Dead code**
  - Signal: a symbol with no reference, a branch that no input reaches, a
    parameter that no caller sets, or a finding of the project's dead-code
    tool.
  - Refactoring: Remove Dead Code, with the proof that
    `refactoring-rules.md` requires.
  - Leave it when: the symbol is part of the contract, or reflection or
    configuration reaches it.
- **Speculative generality**
  - Signal: an interface with one implementation, a parameter with one value,
    a hook that no one uses.
  - Refactoring: Inline Function, Collapse Hierarchy, Remove Parameter.
  - Leave it when: a test double is the second implementation, or the
    contract exposes the extension point.
- **Lazy element**
  - Signal: a function or a module that adds a name and nothing else.
  - Refactoring: Inline Function, Inline Module.
  - Leave it when: the name states a rule that its body does not.

## Comments

- **Comment that explains what**
  - Signal: a comment that restates the next lines.
  - Refactoring: Extract Function or Rename until the comment adds nothing,
    then remove it.
  - Leave it when: the comment says why, names an origin, or warns of a
    consequence.
- **Commented-out code**
  - Signal: code inside a comment.
  - Refactoring: Remove Dead Code.
  - Leave it when: the comment is an example in documentation.

## Design

- **Hidden dependency**
  - Signal: a decision that reads a system boundary on its own: the clock,
    randomness, the process environment, the filesystem, the network, a
    database, or a global singleton. Kind `boundary-in-logic`.
  - Refactoring: Parameterize Function or Parameterize Constructor, with a
    default equal to the current collaborator, so that no caller changes.
  - Leave it when: the function is the shell that performs the effect, or
    the entry point that wires the program.
- **Constructor that does work**
  - Signal: a constructor that creates a collaborator, reaches a system
    boundary, loops, or branches: anything beyond storing its arguments.
  - Refactoring: Parameterize Constructor for the collaborator. Then Replace
    Constructor with Factory Function for the work that remains.
  - Leave it when: the constructor builds value objects from its arguments.
- **Decision interleaved with effects**
  - Signal: one function that reads a system boundary, decides, and writes
    to a system boundary, with branches between the reads and the writes.
  - Refactoring: Split Phase. The decision becomes a function that returns a
    value, and the caller performs the effect.
  - Leave it when: the function has one branch and one effect.
- **Infrastructure type in a rule**
  - Signal: a module that holds business rules and imports a database, an
    HTTP, a queue, or a user-interface type.
  - Refactoring: Extract Interface, owned by the module with the rules, and
    Move Function for the code that uses the type.
  - Leave it when: the project has no layer that separates rules from
    infrastructure. Never add a layer.
- **Information leakage**
  - Signal: one format, layout, or rule that two modules both know, such as
    a reader and a writer of one file format.
  - Refactoring: Move Function until one module owns the knowledge. Then
    Encapsulate Record for the data it exposes.
  - Leave it when: the two modules are the two sides of a protocol that an
    external system fixes.
- **Inheritance without substitution**
  - Signal: an override that throws, does nothing, or weakens what the
    parent promises, or a subclass that exists only to reuse helpers.
  - Refactoring: Replace Subclass with Delegate, or Replace Superclass with
    Delegate.
  - Leave it when: every caller of the parent works with the subclass.
- **Unstable dependency**
  - Signal: a module that three or more modules import, and that itself
    imports a file at the head of `hotspots.top`.
  - Refactoring: Extract Interface, owned by the imported module. The hotspot
    implements it.
  - Leave it when: the two modules change together in the git history.

## Agent-written code

Code that an agent wrote shows these smells more often than code a person
wrote: copies in place of calls, a second idiom beside the project's, checks
that nothing can fail, and errors caught and dropped.

- **Reinvented function**
  - Signal: a function with the same result as one the project or the
    standard library already has, often under a synonym, such as
    `formatPrice` beside `renderCurrency`. A helper that no other file
    calls.
  - Refactoring: Replace Inline Code with Function Call, for every caller.
    Then Remove Dead Code.
  - Leave it when: the two differ in one branch that a test records.
- **Convention drift**
  - Signal: a second idiom for a concern the project settled, used in fewer
    than one in five places: a second HTTP client, logger, assertion style,
    error type, or naming case.
  - Refactoring: Replace with Project Idiom, one concern per subtask, with
    the file that shows the dominant idiom named as the exemplar.
  - Leave it when: the project's docs allow both idioms.
- **Impossible-state check**
  - Signal: a null check or a type check on a value that the type system,
    the signature, or a check a few lines earlier already guarantees.
  - Refactoring: Remove Dead Code, with the proof that
    `refactoring-rules.md` requires.
  - Leave it when: the value enters from a system boundary or a public
    entry point.
- **Leftover compatibility path**
  - Signal: an alias that re-exports a renamed symbol, a branch named
    legacy or fallback, or a flag that one place reads with one value. Kind
    `compat-path`.
  - Refactoring: Remove Dead Code, with the proof that
    `refactoring-rules.md` requires.
  - Leave it when: a caller outside the repository uses the old form.
- **Magic literal**
  - Signal: a URL, a path, or a number other than 0, 1, and -1 inside a
    decision. Kind `hard-coded-value`.
  - Refactoring: Replace Magic Literal with a named constant, or move the
    value into the configuration the project reads at its entry point.
  - Leave it when: the literal appears once and the line names it.
- **Credential in code**
  - Signal: a key, a token, or a password as a literal. Kind `credential`,
    with the value hidden.
  - Report: the location alone. Never copy the value into a task or a note.
- **Masked error**
  - Signal: a catch that logs and continues, an empty catch, or a default
    returned in place of an error. Kind `masked-error`.
  - Report: the location and the statement that the code keeps the
    behavior. Letting the error through is a behavior change.
  - Leave it when: the catch sits at a system boundary and the project's
    docs name that behavior.
- **Placeholder**
  - Signal: a marker comment for unfinished work, a not-implemented error,
    or a stub that returns nothing. Kind `placeholder`.
  - Report: the location, as a feature gap. When no code reaches the stub,
    Remove Dead Code instead, with the proof.

## Legibility

An agent reads code through a context window of limited size and finds code
by searching for names. These entries keep both cheap.

- **Oversized file**
  - Signal: a code file over 400 lines, or over the project's own file
    length limit. Kind `oversized-file`.
  - Refactoring: Extract Module, one concept per file, named by the concept.
  - Leave it when: the file is a flat list, such as a route table, a
    configuration table, or generated code.
- **Implicit wiring**
  - Signal: a collaborator reached by reflection, a string name, a global
    registration, or a patch at import time, so that no import names it.
    Kind `implicit-wiring`.
  - Refactoring: Replace Implicit Wiring with an import and a call that a
    search for the name finds.
  - Leave it when: the project's framework requires the form, such as its
    dependency injection container or its plugin registry.

## Tests

A test file is in the refactor scope. Inside it, only these entries are
findings, and a smell of another section is none.

- **Weak test**
  - Signal: an assertion that proves nothing, such as not null, not
    throwing, or truthy. Also an expected value computed with the logic of
    the code under test. Kind `weak-assertion` for the first form.
  - Refactoring: Replace Assertion with Literal: the value, the state, or
    the error that the unchanged code produces, written as a literal.
  - Leave it when: the test guards a type at a system boundary and the
    project's docs say so.
- **Over-mocked test**
  - Signal: a test double for a collaborator inside the project that is
    fast and deterministic, or for a part of the unit under test.
  - Refactoring: Replace Test Double with Real Collaborator. A test that
    then fails shows a difference the double hid: the subtask states that
    the implementer reverts and reports it.
  - Leave it when: the collaborator reaches a system boundary.
- **Unfindable test**
  - Signal: a test file whose name and whose content never name the unit it
    tests, so that a search for the unit's name misses it.
  - Refactoring: Rename, to the project's test naming for that unit.
  - Leave it when: the project's framework fixes the test file names.
- **Skipped test**
  - Signal: a skip marker or a focus marker. Kind `skipped-test`.
  - Report: the test name and the reason the marker or its commit gives.
