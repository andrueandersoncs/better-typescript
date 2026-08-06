# prefer-equivalence-strict-equal

## Classification

Reported default policy; Effect equality idiom; file-local syntactic detection.

## Active wiring

Last in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEquivalenceStrictEqual.ts
- packages/matchers/src/builtins/preferEquivalenceStrictEqual.ts

## Intent

Make equality semantics explicit through Effect Equivalence.

## Detection boundary

Finds every binary expression using ===, regardless of operand types or context.

## Exemptions and non-findings

!==, ==, !=, and existing Equivalence calls are not findings.

## Guidance

Import Equivalence and replace the comparison with a typed Equivalence.strictEqual comparator.

## Dependencies

TypeScript AST operator classification only.

## Tests and examples

- tests/preferEquivalenceStrictEqual.test.ts
- tests/fixtures/prefer-equivalence-strict-equal/
- packages/guidance/examples/prefer-equivalence-strict-equal/

## Skill migration

- Proposed skill: lint-rule-prefer-equivalence-strict-equal
- Scope: local file
- Required semantic context: binary operator only; operand types are useful for remediation
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse preferEquivalenceStrictEqualMatcher

## Open questions

None identified.
