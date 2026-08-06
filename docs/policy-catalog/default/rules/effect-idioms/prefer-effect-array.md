# prefer-effect-array

## Classification

Reported default policy; Effect collection idiom; file-local semantic detection.

## Active wiring

Listed through effectCollectionPolicies in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectArray.ts
- packages/matchers/src/builtins/preferEffectArray.ts
- packages/matchers/src/support/tsType.ts

## Intent

Prefer Effect Array functions over Array.prototype methods.

## Detection boundary

Finds calls to the enumerated Array.prototype method set, from at through with, when the receiver type is checker-confirmed array-like, including readonly arrays and tuples. The method name is emitted for guidance.

## Exemptions and non-findings

String methods, lookalike objects/classes, Set, non-call property reads, and static Effect Array calls are not findings.

## Guidance

Bind the collection and use the corresponding Effect Array helper instead of invoking its prototype.

## Dependencies

TypeScript checker and shared isArrayLikeType.

## Tests and examples

- tests/preferEffectArray.test.ts
- tests/fixtures/prefer-effect-array/
- packages/guidance/examples/prefer-effect-array/

Fixtures and examples cover mutable/readonly arrays, tuples, Boolean callbacks, strings, and lookalikes.

## Skill migration

- Proposed skill: lint-rule-prefer-effect-array
- Scope: local file
- Required semantic context: receiver type and called member
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: expose preferEffectArrayMatcher method facts

## Open questions

None identified.
