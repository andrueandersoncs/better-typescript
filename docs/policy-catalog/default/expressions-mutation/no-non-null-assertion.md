# no-non-null-assertion

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noNonNullAssertion.ts`; `packages/matchers/src/builtins/noNonNullAssertion.ts`.

## Intent
Handle absence explicitly instead of suppressing TypeScript's nullability proof.

## Detection boundary
Reports every TypeScript `NonNullExpression` (`expression!`).

## Exemptions and non-findings
No syntax exemption. Ordinary logical negation and definite-assignment declaration syntax are different node kinds and do not match.

## Guidance
Convert with `Option.fromNullishOr` and handle both branches, or use a checker-verifiable guard.

## Dependencies
TypeScript AST only.

## Tests and examples
`tests/noNonNullAssertion.test.ts`; `tests/fixtures/no-non-null-assertion/`; `packages/guidance/examples/no-non-null-assertion/`.

## Skill migration
Proposed `lint-rule-no-non-null-assertion`; local expression scope; requires syntax only; expressions/mutation fleet, candidate phase; deterministic candidate generation can query non-null-expression nodes.

## Open questions
None identified.
