# no-duplicate-function-names

## Classification
Reported default expressions/mutation policy with workspace-wide indexing.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noDuplicateFunctionNames.ts`; `packages/matchers/src/builtins/noDuplicateFunctionNames.ts`; `packages/matchers/src/support/tsNode.ts`; `packages/matchers/src/support/paths.ts`; `packages/matchers/src/sources/sources.ts`.

## Intent
Expose duplicated top-level helper concepts that should have one domain-owned implementation.

## Detection boundary
Indexes named top-level function declarations and function-valued variable statements in every project source file. For each name, reports declarations found in another file whose callable types are mutually assignable; lists at most three relative files plus a remainder count.

## Exemptions and non-findings
Skips nested functions, methods, object methods, non-function values, same-file overloads alone, and same names with non-equivalent signatures/arity. Same-signature module-vocabulary functions are intentionally findings.

## Guidance
Extract one shared implementation into a domain-specific module, not a generic utility module.

## Dependencies
Whole TypeScript program source-file index, checker type assignability, and relative-path formatting.

## Tests and examples
`tests/noDuplicateFunctionNames.test.ts`; `tests/fixtures/no-duplicate-function-names/`; `packages/guidance/examples/no-duplicate-function-names/`.

## Skill migration
Proposed `lint-rule-no-duplicate-function-names`; workspace cross-file scope; requires a top-level callable index and mutually assignable resolved types; expressions/mutation fleet, workspace-index phase; deterministic candidate generation should build the existing name index before model review.

## Open questions
None identified.
