# Better TypeScript

TypeScript analysis for coding agents: Checks emit Detections, Wiring materializes Signals, and
derive emits Advice.

## Language

**Physical Module**: One TypeScript source file — the language-level module boundary. Advice may
still title a directory when clusters span files. _Avoid_: component, service, package (unless
meaning npm package)

**Semantic Module**: One equivalence class in the strict partition of Code Entities that belong
together and therefore belong in the same Physical Module, regardless of their current placement.
Singletons are valid. _Avoid_: cluster, group

**Split Semantic Module**: A Semantic Module whose Code Entities currently occupy more than one
Physical Module. Its canonical first member is only a reporting anchor, never a destination.

**Mixed Physical Module**: A Physical Module that currently contains Code Entities from more than
one Semantic Module.

**Semantic Module Snapshot**: One versioned, immutable, Program-scoped evidence artifact containing
normalized Code Entities, their Semantic Module partition and proof forest, bonds, and exclusions.
It is the reusable interface for membership and Membership Proof queries.

**Code Entity**: The smallest independently movable, symbol-bearing family of top-level
declarations. Nested declarations and expressions are evidence about their owning Code Entity;
imports and exports describe Physical Module edges. _Avoid_: node, statement

**Semantic Reference Graph**: One Program- and stratum-scoped directed graph whose Code Entity edges
are TypeChecker-resolved references of any kind. It is placement-independent evidence: export
syntax, names, paths, and consumers outside the Program do not affect it.

**Hard Bond**: An explainable semantic relation sufficient by itself to require two eligible Code
Entities to share a Semantic Module. A dependency alone is not a Hard Bond; a named law must prove
atomicity or ownership.

**Exclusive Consumer Ownership**: The neutral law that a Semantic Reference Graph component with
exactly one consumer component and no unowned consumer belongs with that consumer. Multiple
consumers mean shared dependency, not ownership, and the law is withheld when consumer and target
carry disjoint Semantic Subjects.

**Semantic Subject**: The first-party data declaration an operation is about. An operation taking at
least two value parameters that are all one data declaration and returning a boolean verdict is
owned by that declaration; a value helper whose initializer references exactly one distinct subject
inherits it. A helper that takes the type twice without returning a verdict is an ordinary
dependency. _Avoid_: owner type, receiver

**Semantic Reference Cycle**: A strongly connected Semantic Reference Graph component with more than
one Code Entity. The neutral cycle law treats it as atomic, including an ownerless root cycle.

**Paradigm Hard Bond Rule**: A named coding-model-specific law that emits Hard Bonds from
TypeChecker-resolved Program facts. Every emitted pair must be semantically necessary under that
paradigm and carry replayable evidence. _Avoid_: heuristic, convention

**Partition Barrier**: An absolute prohibition against joining two otherwise eligible Code Entities.
Inference rejects and records a candidate bond that crosses one before membership closure. Source
exclusion is not a Partition Barrier: an excluded declaration never becomes a Code Entity.

**Membership Proof**: The deterministic ordered Hard-Bond chain explaining why two Code Entities
share one Semantic Module. Self-membership has an empty proof; entities in different Semantic
Modules have none.
