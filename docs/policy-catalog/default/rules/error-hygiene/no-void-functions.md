# no-void-functions

## Classification
Reported default error-hygiene policy.

## Active wiring
`errorHygienePolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noVoidFunctions.ts`; `packages/matchers/src/builtins/noVoidFunctions.ts`; `packages/matchers/src/support/tsNode.ts`; `packages/matchers/src/support/tsType.ts`.

## Intent
Make authored side effects return Effect instead of `void` while respecting consumer-imposed callbacks.

## Detection boundary
Checks function declarations, expressions, arrows, and methods whose resolved signature returns void; reports the named target when the void contract belongs to the declaration.

## Exemptions and non-findings
Allows contextually typed function initializers whose consumer signature permits void and methods inside contextually typed object literals. Constructors/accessors are outside the candidate kinds; non-void and Effect-returning callables are clean.

## Guidance
Delete no-ops or describe side effects with `Effect.sync`/`Effect.gen`; annotate third-party callbacks with the consumer's callback type.

## Dependencies
TypeScript checker, contextual types, call signatures, and void-type helpers.

## Tests and examples
`tests/noVoidFunctions.test.ts`; `tests/fixtures/no-void-functions/`; `packages/guidance/examples/no-void-functions/`.

## Skill migration
Proposed `lint-rule-no-void-functions`; local callable finding with semantic consumer context; requires resolved and contextual signatures; error-hygiene fleet, semantic candidate phase; deterministic candidate generation can enumerate callable nodes and classify with the checker.

## Open questions
None identified.
