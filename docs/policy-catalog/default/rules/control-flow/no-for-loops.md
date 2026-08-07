# no-for-loops

## Classification

Reported default policy; imperative control flow; file-local syntactic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noForLoops.ts
- packages/matchers/src/builtins/noForLoops.ts

## Intent

Replace iterator-style C for loops with Effect Array transformations.

## Detection boundary

Reports a ForStatement only when it has a condition and at least one of initializer or incrementor. This distinguishes iterator loops from open-ended polling/control loops.

## Exemptions and non-findings

for (;;) and a condition-only for (; condition;) are not findings. for..in and for..of are handled by separate policies.

## Guidance

Use Array.map, reduce, filter, flatMap, or another matching combinator.

## Dependencies

TypeScript ForStatement parts only.

## Tests and examples

- tests/noForLoops.test.ts
- tests/fixtures/no-for-loops/
- packages/guidance/examples/no-for-loops/

## Skill migration

- Proposed skill: lint-rule-no-for-loops
- Scope: local file
- Required semantic context: condition/initializer/incrementor presence
- Runner phase/fleet: syntax detection / control-flow
- Deterministic candidate generation: reuse noForLoopsMatcher

## Open questions

None identified.
