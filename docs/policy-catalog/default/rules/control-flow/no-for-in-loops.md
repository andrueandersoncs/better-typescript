# no-for-in-loops

## Classification

Reported default policy; imperative control flow; file-local syntactic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noForInLoops.ts
- packages/matchers/src/builtins/noForInLoops.ts

## Intent

Replace imperative record iteration with Effect Record operations.

## Detection boundary

Reports every for..in statement, independent of body, iterable type, or mutation.

## Exemptions and non-findings

No for..in form is exempt. Record/Object combinator expressions are not findings.

## Guidance

Use Record.map, Record.reduce, Record.toEntries, or the matching Effect Record operation.

## Dependencies

TypeScript ForInStatement AST only.

## Tests and examples

- tests/noForInLoops.test.ts
- tests/fixtures/no-for-in-loops/
- packages/guidance/examples/no-for-in-loops/

## Skill migration

- Proposed skill: lint-rule-no-for-in-loops
- Scope: local file
- Required semantic context: for..in statement only
- Runner phase/fleet: syntax detection / control-flow
- Deterministic candidate generation: reuse noForInLoopsMatcher

## Open questions

None identified.
