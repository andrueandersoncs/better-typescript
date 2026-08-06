# no-unused

## Classification
Reported default error-hygiene policy.

## Active wiring
`errorHygienePolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noUnused.ts`; `packages/matchers/src/builtins/noUnused.ts`.

## Intent
Remove unused imports, declarations, types, and parameters.

## Detection boundary
Runs TypeScript semantic diagnostics with `noUnusedLocals` and `noUnusedParameters`, then reports diagnostic codes 6133, 6192, 6196, 6138, 6198, 6199, and 6205 at their source positions.

## Exemptions and non-findings
Follows TypeScript's diagnostic behavior. Used/exported declarations and underscore-prefixed intentionally unused parameters are clean in fixtures; diagnostics lacking file/start positions are discarded.

## Guidance
Delete the unused item or prefix a contract-required unused parameter with `_`.

## Dependencies
Whole TypeScript program semantic diagnostics and forced compiler options.

## Tests and examples
`tests/noUnused.test.ts`; `tests/fixtures/no-unused/`; `packages/guidance/examples/no-unused/`.

## Skill migration
Proposed `lint-rule-no-unused`; file findings with project semantic scope; requires a compiled TypeScript program and usage graph; error-hygiene fleet, semantic-diagnostics phase; deterministic candidate generation should consume TypeScript diagnostics rather than model inspection.

## Open questions
None identified.
