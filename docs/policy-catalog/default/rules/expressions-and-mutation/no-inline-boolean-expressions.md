# no-inline-boolean-expressions

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noInlineBooleanExpressions.ts`; `packages/matchers/src/builtins/noInlineBooleanExpressions.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Give multi-part `if` decisions a domain name.

## Detection boundary
Checks `IfStatement` conditions after expression unwrapping and reports when the root condition is a binary `&&` or `||` expression.

## Exemptions and non-findings
Allows named condition variables, single conditions, comparisons, and logical expressions outside an `if` root. Nested logical structure is handled once at the root.

## Guidance
Extract the logical expression into a well-named `const` immediately above the `if`.

## Dependencies
TypeScript AST and transparent-expression unwrapping.

## Tests and examples
`tests/noInlineBooleanExpressions.test.ts`; `tests/fixtures/no-inline-boolean-expressions/`; `packages/guidance/examples/no-inline-boolean-expressions/`.

## Skill migration
Proposed `lint-rule-no-inline-boolean-expressions`; local statement scope; requires syntax only; expressions/mutation fleet, candidate phase; deterministic candidate generation can query `if` nodes with logical binary roots.

## Open questions
None identified.
