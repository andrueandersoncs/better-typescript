# ADR-0025: Semantic subject ownership needs a verdict

## Status

Accepted

## Date

2026-08-09

## Context

Semantic Module inference had two neutral Hard Bond rules: `semantic-reference-cycle` and
`exclusive-consumer-ownership`. Together they classified `packages/core/src/engine/signal/` as clean
even though one file held three unrelated equality families:

- `Detection`: `detectionEquals`, `detectionsEquivalence`
- `Signal`: `signalEquals`, `signalArrayEquivalence`
- `WiringSignals`: `wiringSignalsEquals`, `wiringSignalsArrayEquivalence`

`exclusive-consumer-ownership` absorbed each family into the next one's chain, because every
equality was privately consumed by exactly one later equality. The six entities became one Semantic
Module, so no split or mixed finding existed to report. The policy model expressed dependency
ownership but had no way to say that `detectionEquals` belongs to `Detection`.

Adding subject ownership by itself is not enough: any binary helper over a first-party type would
claim a subject. Inside the placement engine, `makeBondKey(left, right)` and
`sameSymbolEvidence(left, right)` take two `SemanticModuleEntityKey` values as plumbing, and the
engine's 100-entity private chain would have been dragged into the key schema's module — a partition
that can only be satisfied by merging a 2,700-line engine into a schema file.

## Decision

An operation is owned by a data subject when it takes at least two value parameters that are all the
same first-party data declaration **and** its result is a boolean verdict. A `this` parameter is a
receiver annotation and never counts as an operand. A value helper whose initializer is a call whose
references resolve to exactly one distinct subject inherits that subject. Subject resolution
iterates to a fixpoint over canonically ordered entities before bond closure and emits
`semantic-subject-ownership` candidates with the operation, subject, derivation kind, and anchor.

`exclusive-consumer-ownership` evidence became version 2, carrying both resolved subject sets. The
bond is withheld when consumer and target components each carry subjects and share none.

Alternatives rejected:

- **Parameters alone decide the subject.** Rejected: identity plumbing (`orderedEntityKeys`,
  `makeBondKey`, `sameSymbolEvidence`) then owns schema modules, producing partitions no file layout
  can satisfy.
- **Also accept comparator (`number`) and merge (`T`) results.** Rejected for now: the researched
  defect is the equality family, and the wider law fires on `compareLocations` and `combineSurface`
  with no evidence that those relocations improve cohesion. A future rule may extend the verdict set
  when a real defect demands it.
- **Constrain by filename or directory.** Rejected: ADR-0020 keeps files as module boundaries and
  placement analysis stays placement-independent.
- **Single-parameter predicates and curried operand chains.** Deferred: `isBlank(x: Detection)` and
  `equals(a: Detection)(b: Detection)` are outside the law. One operand cannot distinguish an
  operation over a subject from an ordinary consumer of it, and admitting curried chains would
  re-open the identity-plumbing entanglement this decision exists to prevent. Both are accepted
  scope limitations, locked by fixture cases.

## Consequences

- Equality, predicate, and derived-equivalence families now bond to their data type, so a file
  mixing three families reports one mixed Physical Module and three split Semantic Modules.
- Ownership chains stop at proven subject boundaries, so implementation privacy can no longer hide a
  boundary that subject resolution proved.
- The repository absorbed seven relocations, including the removal of
  `packages/core/src/engine/signal/detectionEquals.ts`,
  `packages/matchers/src/builtins/conceptControl/dataStructureEntry.ts`, and
  `packages/matchers/src/builtins/functionalCoreEffect/allowedTargetRoles.ts`.
- `semantic-module-placement` is enrolled in self-hosting again; the report is empty and the warmed
  benchmark mean is 69.1ms.
- Subject resolution costs one extra fixpoint over the entity list per Program; each pass indexes
  references by consumer, so the cost is linear in references per pass.
