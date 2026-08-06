# no-array-spread

## Classification

Reported default policy; immutable collection construction; file-local syntactic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noArraySpread.ts
- packages/matchers/src/builtins/noArraySpread.ts

## Intent

Use explicit Effect Array operations instead of array-spread construction.

## Detection boundary

Reports every spread element whose direct parent is an array literal. Each spread in one literal produces a finding.

## Exemptions and non-findings

Call-argument spreads, object spreads, and array literals without spread elements are not findings.

## Guidance

Use Array.append/prepend for one value, appendAll/prependAll for arrays, or fromIterable for iterables.

## Dependencies

TypeScript spread/array-literal AST only.

## Tests and examples

- tests/noArraySpread.test.ts
- tests/fixtures/no-array-spread/
- packages/guidance/examples/no-array-spread/

## Skill migration

- Proposed skill: lint-rule-no-array-spread
- Scope: local file
- Required semantic context: spread parent kind
- Runner phase/fleet: syntax detection / control-flow
- Deterministic candidate generation: reuse noArraySpreadMatcher

## Open questions

None identified.
