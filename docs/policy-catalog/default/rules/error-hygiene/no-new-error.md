# no-new-error

## Classification
Reported default error-hygiene policy.

## Active wiring
`errorHygienePolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noNewError.ts`; `packages/matchers/src/builtins/noNewError.ts`.

## Intent
Replace anonymous built-in errors with domain-specific tagged errors.

## Detection boundary
Reports `new Error(...)` when the constructor expression is the bare identifier text `Error`.

## Exemptions and non-findings
Allows other constructors, qualified `ns.Error`, and calling `Error(...)` without `new`. The matcher is syntax-based and does not resolve shadowing.

## Guidance
Declare an Effect `Schema.TaggedErrorClass` and instantiate that specific error.

## Dependencies
TypeScript AST only.

## Tests and examples
`tests/noNewError.test.ts`; `tests/fixtures/no-new-error/`; `packages/guidance/examples/no-new-error/`.

## Skill migration
Proposed `lint-rule-no-new-error`; local expression scope; requires syntax only for parity; error-hygiene fleet, candidate phase; deterministic candidate generation can search `new Error` then validate the AST callee.

## Open questions
Whether skill migration should preserve the current shadowed-local `Error` behavior is not specified.
