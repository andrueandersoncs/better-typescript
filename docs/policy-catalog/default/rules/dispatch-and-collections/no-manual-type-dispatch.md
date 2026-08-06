# no-manual-type-dispatch

## Classification
Reported default dispatch/collections policy.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noManualTypeDispatch.ts`; `packages/matchers/src/builtins/noManualTypeDispatch.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Replace hand-rolled dispatch ladders with exhaustive Effect `Match` programs.

## Detection boundary
Reports only the head of at least three adjacent, branchless `if` guards whose bodies always exit and whose conditions share at least one identifier discriminant.

## Exemptions and non-findings
Allows two-guard sequences, validation guards over different subjects, non-exiting branches, `else if` chains/else branches, and later members of a detected chain.

## Guidance
Use `Match.value(subject)`, `Match.when` per case, and preferably `Match.exhaustive`.

## Dependencies
TypeScript AST, sibling/identifier analysis, and `alwaysExitsScope`.

## Tests and examples
`tests/noManualTypeDispatch.test.ts`; `tests/fixtures/no-manual-type-dispatch/`; `packages/guidance/examples/no-manual-type-dispatch/`.

## Skill migration
Proposed `lint-rule-no-manual-type-dispatch`; local sibling-chain scope; requires AST, exit analysis, and shared-discriminant detection; dispatch/collections fleet, candidate phase; deterministic candidate generation can reuse chain detection.

## Open questions
None identified.
