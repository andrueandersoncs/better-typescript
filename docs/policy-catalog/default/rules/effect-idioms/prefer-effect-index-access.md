# prefer-effect-index-access

## Classification

Reported default policy; Effect collection idiom; file-local semantic detection.

## Active wiring

Listed through effectCollectionPolicies in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectIndexAccess.ts
- packages/matchers/src/builtins/preferEffectIndexAccess.ts
- packages/matchers/src/support/tsType.ts

## Intent

Make partial array access explicit and preserve tuple positional typing through Effect helpers.

## Detection boundary

Finds every element-access expression whose receiver type is checker-confirmed array-like, including arrays, readonly arrays, and tuples, for literal or dynamic indexes.

## Exemptions and non-findings

Record element access, string indexing, and Array.get or Tuple.get calls are not findings.

## Guidance

Use Array.get for partial access, Array.headNonEmpty for proven non-empty collections, or Tuple.get for fixed tuples.

## Dependencies

TypeScript checker and shared isArrayLikeType.

## Tests and examples

- tests/preferEffectIndexAccess.test.ts
- tests/fixtures/prefer-effect-index-access/
- packages/guidance/examples/prefer-effect-index-access/

## Skill migration

- Proposed skill: lint-rule-prefer-effect-index-access
- Scope: local file
- Required semantic context: receiver array/tuple type and index expression
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse preferEffectIndexAccessMatcher

## Open questions

None identified.
