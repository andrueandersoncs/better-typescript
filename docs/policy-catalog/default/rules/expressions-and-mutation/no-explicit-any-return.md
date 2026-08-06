# no-explicit-any-return

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noExplicitAnyReturn.ts`; `packages/matchers/src/builtins/noExplicitAnyReturn.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Require explicit function return contracts to use precise or safely unknown types.

## Detection boundary
Checks return type declarations on functions, arrows, methods, getters, method/call signatures, and function types. Reports explicit return type syntax containing the `any` keyword, including nested unions/generic containers recognized by `hasAnyReturnType`.

## Exemptions and non-findings
Allows inferred `any`, `any` parameters, setters, standalone `any` aliases, and return annotations that refer to an alias of `any` rather than spelling `any` in the return type.

## Guidance
Use a precise return type, or `unknown` at an untyped boundary and narrow before use.

## Dependencies
TypeScript AST and shared return-type helpers.

## Tests and examples
`tests/noExplicitAnyReturn.test.ts`; `tests/fixtures/no-explicit-any-return/`; `packages/guidance/examples/no-explicit-any-return/`.

## Skill migration
Proposed `lint-rule-no-explicit-any-return`; local signature scope; requires type syntax only for parity; expressions/mutation fleet, candidate phase; deterministic candidate generation can reuse the return-type AST traversal.

## Open questions
Whether alias-expanded and inferred `any` should remain exempt after migration is not specified.
