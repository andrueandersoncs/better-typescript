# require-result-shape-name-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requireResultShapeNameConsistency.ts`; `packages/matchers/src/builtins/requireResultShapeNameConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Make strong operation words agree with the returned shape/cardinality.

## Detection boundary
Checks callable definitions. `average/count/length/size/sum/total` expect number, `group/index` keyed data, `filter/map` collections, and `head/last` optional-one cardinality. Reports only known contradictory observed semantics.

## Exemptions and non-findings
Skips unrecognized/ambiguous operations, unknown shapes/cardinality, and matching results. Recognized words used away from the parsed operation position are not claims.

## Guidance
Align the name with the actual result or change the return type/shape to satisfy the operation contract.

## Dependencies
TypeScript checker and shared callable operation, result-shape, and cardinality inference.

## Tests and examples
`tests/requireResultShapeNameConsistency.test.ts`; `tests/fixtures/require-result-shape-name-consistency/`; `packages/guidance/examples/require-result-shape-name-consistency/`.

## Skill migration
Proposed `lint-rule-require-result-shape-name-consistency`; local callable scope; requires parsed operation and resolved shape/cardinality; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
