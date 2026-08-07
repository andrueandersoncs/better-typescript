# no-duplicate-if-bodies

## Classification
Reported default expressions/mutation policy.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noDuplicateIfBodies.ts`; `packages/matchers/src/builtins/noDuplicateIfBodies.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Merge pseudo-duplicate branches whose only difference is their condition.

## Detection boundary
Token-fingerprints branch bodies after unwrapping a one-statement block. Reports an adjacent pair of branchless guard `if`s with identical scope-exiting bodies, or an `else if` whose body equals its parent's body; supplies `first || second` guidance text.

## Exemptions and non-findings
Skips non-exiting duplicate guards, separated guards, guards with else branches, different bodies, and non-adjacent cases. Semicolons are ignored in fingerprints; other tokens must match.

## Guidance
Combine the two conditions into one `if (a || b)` branch.

## Dependencies
TypeScript AST/source tokens and `alwaysExitsScope`/single-block unwrapping helpers.

## Tests and examples
`tests/noDuplicateIfBodies.test.ts`; `tests/fixtures/no-duplicate-if-bodies/`; `packages/guidance/examples/no-duplicate-if-bodies/`.

## Skill migration
Proposed `lint-rule-no-duplicate-if-bodies`; local sibling/parent branch scope; requires exact token fingerprints and exit analysis; expressions/mutation fleet, candidate phase; deterministic candidate generation can reuse the matcher and combined-condition fact.

## Open questions
None identified.
