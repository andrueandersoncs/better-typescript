# no-error-type

## Classification
Reported default error-hygiene policy.

## Active wiring
`errorHygienePolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noErrorType.ts`; `packages/matchers/src/builtins/noErrorType.ts`.

## Intent
Keep failure types specific, preserved generically, or explicitly unknown at untyped boundaries.

## Detection boundary
Reports type references whose rightmost name is `Error` and whose checker symbol equals the global built-in `Error` type, including `globalThis.Error`.

## Exemptions and non-findings
Allows locally shadowed `Error` types, `ErrorConstructor`, runtime `Error` values, tagged errors, generics, and declaration merging syntax that is not a type reference use.

## Guidance
Use a specific tagged error, preserve the caller's error type parameter, or use `unknown` at an untyped boundary.

## Dependencies
TypeScript AST and checker symbol resolution.

## Tests and examples
`tests/noErrorType.test.ts`; `tests/fixtures/no-error-type/`; `packages/guidance/examples/no-error-type/`.

## Skill migration
Proposed `lint-rule-no-error-type`; local type-reference scope; requires global-symbol resolution; error-hygiene fleet, candidate phase; deterministic candidate generation can search `Error` type nodes then resolve identity.

## Open questions
None identified.
