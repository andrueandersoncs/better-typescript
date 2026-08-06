# service-method-effect-fn

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaServiceMethod.ts`; `packages/matchers/src/builtins/effectQuality/reportedSchemaExportedEffectFn.ts`; `packages/matchers/src/builtins/effectQuality/reportedSchemaEffectReturn.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Give public Effect operations stable tracing names through `Effect.fn`.

## Detection boundary
Reports Effect-returning methods in recognized `Context.Service` make objects when not a named `Effect.fn`, plus exported Effect-returning functions and variables. It excludes parameterized functions returning a direct `Effect.gen` shape owned by `prefer-effect-fn`.

## Exemptions and non-findings
Private/local functions, already named `Effect.fn` values, non-Effect returns, and service members outside recognized make-object shapes are quiet.

## Guidance
Wrap public operations with a domain-qualified named `Effect.fn`.

## Dependencies
TypeScript checker return types, `Context.Service` configuration recognition, Effect import identity, export/scope helpers.

## Tests and examples
Positive service fixture: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No dedicated exported-function fixture or refactor pair identified.

## Skill migration
Propose `lint-rule-effect-quality-service-method-effect-fn`; local scope; export, service, and return-type semantics; Effect API-design fleet, semantic phase; deterministic checker-backed candidates: strong.

## Open questions
Coverage does not separately assert each supported service/export shape or overlap suppression.
