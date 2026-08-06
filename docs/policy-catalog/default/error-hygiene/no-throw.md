# no-throw

## Classification
Reported default error-hygiene policy.

## Active wiring
`errorHygienePolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noThrow.ts`; `packages/matchers/src/builtins/noThrow.ts`.

## Intent
Represent failures as typed Effect values instead of JavaScript control-flow exceptions.

## Detection boundary
Reports every TypeScript `ThrowStatement`, regardless of thrown expression or nesting.

## Exemptions and non-findings
No syntactic throw exemption. Words/properties containing `throw`, returned error values, and other non-`ThrowStatement` syntax do not match.

## Guidance
Define a `Schema.TaggedErrorClass` and yield the typed error through Effect.

## Dependencies
TypeScript AST only.

## Tests and examples
`tests/noThrow.test.ts`; `tests/fixtures/no-throw/`; `packages/guidance/examples/no-throw/`.

## Skill migration
Proposed `lint-rule-no-throw`; local statement scope; requires syntax only; error-hygiene fleet, candidate phase; deterministic candidate generation can use an AST query or textual `throw` candidates followed by syntax validation.

## Open questions
None identified.
