# no-mutable-variable-declarations

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noMutableVariableDeclarations.ts`; `packages/matchers/src/builtins/noMutableVariableDeclarations.ts`.

## Intent
Model state transitions as immutable values or Effect-managed state.

## Detection boundary
Reports every `VariableDeclarationList` whose first token is `let` or `var`, including multi-declarations, uninitialized declarations, and loop initializers.

## Exemptions and non-findings
Allows all `const` declarations and `for (const ... of ...)`. There are no scope- or reassignment-based exemptions for `let`/`var`.

## Guidance
Use successive immutable `const` values; move genuinely evolving shared state into Effect `Ref`.

## Dependencies
TypeScript AST/source-token access.

## Tests and examples
`tests/noMutableVariableDeclarations.test.ts`; `tests/fixtures/no-mutable-variable-declarations/`; `packages/guidance/examples/no-mutable-variable-declarations/`.

## Skill migration
Proposed `lint-rule-no-mutable-variable-declarations`; local declaration scope; requires syntax only; expressions/mutation fleet, candidate phase; deterministic candidate generation can query `let`/`var` declaration lists.

## Open questions
None identified.
