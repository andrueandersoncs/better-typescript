# no-weak-map

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noWeakMap.ts`; `packages/matchers/src/builtins/noWeakMap.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Avoid hidden mutable caches outside Effect lifecycle/state management.

## Detection boundary
Reports every identifier text `WeakMap` whose resolved symbol is not first-party, covering constructor, type, and value references.

## Exemptions and non-findings
Allows first-party symbols shadowing `WeakMap`, `WeakSet`, and Effect state alternatives. It reports each built-in identifier occurrence rather than one construct-level finding.

## Guidance
Store an immutable collection in an Effect `Ref`, using `SynchronizedRef` or `SubscriptionRef` where required, and allocate it inside Effect/Layer.

## Dependencies
TypeScript checker and first-party symbol provenance.

## Tests and examples
`tests/noWeakMap.test.ts`; `tests/fixtures/no-weak-map/`; `packages/guidance/examples/no-weak-map/`.

## Skill migration
Proposed `lint-rule-no-weak-map`; local identifier scope; requires symbol provenance; expressions/mutation fleet, semantic candidate phase; deterministic candidate generation can search `WeakMap` then resolve the symbol.

## Open questions
None identified.
