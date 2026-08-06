# no-undefined

## Classification
Reported default error-hygiene policy with five finding kinds.

## Active wiring
`errorHygienePolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noUndefined.ts`; `packages/matchers/src/builtins/noUndefined.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Keep optionality explicit with `Option` rather than authored `undefined` contracts and checks.

## Detection boundary
Reports optional/undefined parameters; explicit return types containing undefined; `return undefined` and expression-bodied arrows yielding undefined; optional/undefined property and mapped-type declarations; and equality/inequality comparisons with the `undefined` identifier.

## Exemptions and non-findings
Allows null, bare return, required properties, mapped `-?`, non-undefined expressions, `typeof x === "undefined"`, and non-equality use. Generic nested type positions are limited to the helper's recognized undefined-containing return/type forms.

## Guidance
Use `Option`; convert nullish boundaries with `Option.fromNullishOr`/`getOrUndefined`; keep third-party-required undefined inside an inline or consumer-typed callback.

## Dependencies
TypeScript AST and shared type-node/transparent-expression helpers.

## Tests and examples
`tests/noUndefined.test.ts`; `tests/fixtures/no-undefined/`; `packages/guidance/examples/no-undefined/`.

## Skill migration
Proposed `lint-rule-no-undefined`; local declaration/expression scope; requires syntax/type-node structure but not cross-file analysis; error-hygiene fleet, candidate phase; deterministic candidate generation can reuse the five AST subscriptions.

## Open questions
None identified.
