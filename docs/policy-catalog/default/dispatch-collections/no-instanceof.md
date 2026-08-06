# no-instanceof

## Classification
Reported default dispatch/collections policy.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noInstanceof.ts`; `packages/matchers/src/builtins/noInstanceof.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Prefer stable structural/discriminated checks over first-party constructor identity.

## Detection boundary
Reports binary `instanceof` expressions when the right-hand expression resolves to a first-party symbol; records that symbol's class name.

## Exemptions and non-findings
Allows built-in and third-party constructors such as `Error` and `Date`, and structural `Schema.is` checks. The matcher does not report `instanceof` when RHS symbol resolution fails.

## Guidance
Use a stable discriminant, explicit structural guard, or `Schema.is` over a structural schema; `Schema.Class` retains constructor semantics and is not the structural replacement.

## Dependencies
TypeScript checker and first-party symbol provenance.

## Tests and examples
`tests/noInstanceof.test.ts`; `tests/fixtures/no-instanceof/`; `packages/guidance/examples/no-instanceof/`.

## Skill migration
Proposed `lint-rule-no-instanceof`; local expression scope with project provenance; requires RHS symbol resolution; dispatch/collections fleet, semantic candidate phase; deterministic candidate generation can enumerate `instanceof` and classify the RHS symbol.

## Open questions
None identified.
