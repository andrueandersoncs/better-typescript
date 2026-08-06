# prefer-pipe-function

## Classification
Reported default dispatch/collections policy.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/preferPipeFunction.ts`; `packages/matchers/src/builtins/preferPipeFunction.ts`; `packages/matchers/src/support/tsSignature.ts`.

## Intent
Standardize Effect composition on standalone, explicit `pipe(value, ...)`.

## Detection boundary
Reports call expressions whose callee is a `.pipe` property access and whose `pipe` symbol is declared in the Effect package; targets the property name.

## Exemptions and non-findings
Allows standalone `pipe`, non-call property access, and unrelated first-party/RxJS/Node-stream `.pipe` methods whose symbol provenance is not Effect.

## Guidance
Import `pipe` from `effect` and move the receiver to the first argument.

## Dependencies
TypeScript checker and Effect-package symbol provenance.

## Tests and examples
`tests/preferPipeFunction.test.ts`; `tests/fixtures/prefer-pipe-function/`; `packages/guidance/examples/prefer-pipe-function/`.

## Skill migration
Proposed `lint-rule-prefer-pipe-function`; local call scope; requires resolved property symbol provenance; dispatch/collections fleet, semantic candidate phase; deterministic candidate generation can search `.pipe(` and verify the symbol.

## Open questions
None identified.
