# prefer-effect-array-append-all

## Classification

Reported default policy; Effect collection idiom; file-local syntactic detection.

## Active wiring

Listed through effectCollectionPolicies in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectArrayAppendAll.ts
- packages/matchers/src/builtins/preferEffectArrayAppendAll.ts

## Intent

Replace conditional array-spread assembly with Array.appendAll.

## Detection boundary

Finds a spread element inside an array literal when the spread expression is a conditional with exactly one [] arm and one arm that is not an empty array literal. Parentheses are unwrapped.

## Exemptions and non-findings

Unconditional spreads, conditional expressions outside spread positions, both-populated or both-empty arms, and spread arguments to calls are not findings.

## Guidance

Use Effect Array.appendAll to combine the base and conditional arrays.

## Dependencies

TypeScript AST and expression unwrapping only.

## Tests and examples

- tests/preferEffectArrayAppendAll.test.ts
- tests/fixtures/prefer-effect-array-append-all/
- packages/guidance/examples/prefer-effect-array-append-all/

## Skill migration

- Proposed skill: lint-rule-prefer-effect-array-append-all
- Scope: local file
- Required semantic context: array-spread conditional AST
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse preferEffectArrayAppendAllMatcher

## Open questions

None identified.
