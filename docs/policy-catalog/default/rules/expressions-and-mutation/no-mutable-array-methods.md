# no-mutable-array-methods

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noMutableArrayMethods.ts`; `packages/matchers/src/builtins/noMutableArrayMethods.ts`; `packages/matchers/src/support/tsType.ts`.

## Intent
Replace in-place array updates with immutable transformations.

## Detection boundary
Reports calls to `copyWithin/fill/pop/push/reverse/shift/sort/splice/unshift` when the checker classifies the receiver as array-like, including arrays, mutable tuples, constrained generics, unions, and intersections.

## Exemptions and non-findings
Allows immutable array methods, same-named methods on non-array types, Set/Map mutations, and ordinary `ReadonlyArray` operations (which do not expose mutators).

## Guidance
Use Effect `Array` operations or another immutable derivation instead of changing the receiver.

## Dependencies
TypeScript checker and array-like type classification.

## Tests and examples
`tests/noMutableArrayMethods.test.ts`; `tests/fixtures/no-mutable-array-methods/`; `packages/guidance/examples/no-mutable-array-methods/`.

## Skill migration
Proposed `lint-rule-no-mutable-array-methods`; local call scope; requires resolved receiver type; expressions/mutation fleet, semantic candidate phase; deterministic candidate generation can search mutator property calls then type-check receivers.

## Open questions
None identified.
