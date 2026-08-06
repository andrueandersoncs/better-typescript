# no-multiple-boolean-operators

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noMultipleBooleanOperators.ts`; `packages/matchers/src/builtins/noMultipleBooleanOperators.ts`; `packages/matchers/src/support/tsNode.ts`; `packages/matchers/src/sources/sources.ts`.

## Intent
Keep boolean decisions readable by naming intermediate conditions.

## Detection boundary
Reports the outermost expression containing more than one counted operator: `&&`, `||`, `===`, `!==`, unary `!`, or ternary. Traverses transparent syntax and expression children, counts ternary branches separately from their condition, and stops at nested arrow/function/class expressions.

## Exemptions and non-findings
Allows one counted operator; does not count relational operators or loose equality; does not double-report counted descendants; nested execution/class scopes are boundaries.

## Guidance
Extract parts into named `const` conditions.

## Dependencies
TypeScript AST, expression unwrapping, and AST-child traversal.

## Tests and examples
`tests/noMultipleBooleanOperators.test.ts`; `tests/fixtures/no-multiple-boolean-operators/`; `packages/guidance/examples/no-multiple-boolean-operators/`.

## Skill migration
Proposed `lint-rule-no-multiple-boolean-operators`; local expression scope; requires exact syntax tree/operator counting; expressions/mutation fleet, candidate phase; deterministic candidate generation can reuse the recursive counter.

## Open questions
None identified.
