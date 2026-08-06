# no-for-of-loops

## Classification

Reported default policy; imperative control flow; file-local syntactic detection with async fact.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noForOfLoops.ts
- packages/matchers/src/builtins/noForOfLoops.ts

## Intent

Replace imperative iterable consumption with Array or Stream/Effect combinators.

## Detection boundary

Reports every for..of statement and records whether it has an await modifier so remediation can distinguish synchronous and AsyncIterable consumption.

## Exemptions and non-findings

No for..of or for await..of form is exempt. Combinator-based collection/stream pipelines are not findings.

## Guidance

Use Effect Array combinators for synchronous values; use Stream.fromAsyncIterable and Stream/Effect combinators for async values.

## Dependencies

TypeScript ForOfStatement AST and await-modifier presence.

## Tests and examples

- tests/noForOfLoops.test.ts
- tests/fixtures/no-for-of-loops/
- packages/guidance/examples/no-for-of-loops/

Examples include both synchronous and async refactors.

## Skill migration

- Proposed skill: lint-rule-no-for-of-loops
- Scope: local file
- Required semantic context: for..of AST and async modifier
- Runner phase/fleet: syntax detection / control-flow
- Deterministic candidate generation: reuse noForOfLoopsMatcher and isAsync fact

## Open questions

None identified.
