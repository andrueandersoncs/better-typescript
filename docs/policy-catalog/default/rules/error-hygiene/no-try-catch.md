# no-try-catch

## Classification
Reported default error-hygiene policy.

## Active wiring
`errorHygienePolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noTryCatch.ts`; `packages/matchers/src/builtins/noTryCatch.ts`.

## Intent
Model fallible work and recovery in Effect rather than `try` control flow.

## Detection boundary
Reports every TypeScript `TryStatement`, including try/catch, try/finally, and nested tries.

## Exemptions and non-findings
No `TryStatement` exemption. Promise `.catch`, Effect catch combinators, identifiers, and strings containing try/catch words do not match.

## Guidance
Represent failures with typed Effect errors and recover with `Effect.catchTag`, `catchTags`, or `catch`.

## Dependencies
TypeScript AST only.

## Tests and examples
`tests/noTryCatch.test.ts`; `tests/fixtures/no-try-catch/`; `packages/guidance/examples/no-try-catch/`.

## Skill migration
Proposed `lint-rule-no-try-catch`; local statement scope; requires syntax only; error-hygiene fleet, candidate phase; deterministic candidate generation can use an AST query or textual `try` candidates followed by syntax validation.

## Open questions
None identified.
