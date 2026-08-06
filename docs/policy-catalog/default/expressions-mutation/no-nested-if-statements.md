# no-nested-if-statements

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noNestedIfStatements.ts`; `packages/matchers/src/builtins/noNestedIfStatements.ts`.

## Intent
Flatten conditional control flow.

## Detection boundary
Reports an `if` with an ancestor `if` in the same execution scope when reached through a then/body path, including braceless and multi-level nesting.

## Exemptions and non-findings
Treats `else if` and `if` inside an `else` block as non-nested for this rule; stops across function, arrow, method, constructor, getter, and setter boundaries; sibling ifs are clean.

## Guidance
Combine related conditions or use an early return.

## Dependencies
TypeScript AST parent traversal.

## Tests and examples
`tests/noNestedIfStatements.test.ts`; `tests/fixtures/no-nested-if-statements/`; `packages/guidance/examples/no-nested-if-statements/`.

## Skill migration
Proposed `lint-rule-no-nested-if-statements`; local statement scope; requires AST ancestry; expressions/mutation fleet, candidate phase; deterministic candidate generation can reuse ancestor traversal.

## Open questions
None identified.
