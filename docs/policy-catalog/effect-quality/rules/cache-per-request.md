# cache-per-request

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeCacheLifecycle.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Construct Cache once in its owning layer or scope rather than per operation/request.

## Detection boundary
Reports `Cache.make`/`makeWith` inside a function with parameters or a non-module-scope function; nested cache creation inside another cache lookup is excluded.

## Exemptions and non-findings
Top-level/module-scope zero-parameter factory functions and cache creation inside recognized lookup callbacks are quiet.

## Guidance
Build during layer acquisition and close over the shared cache handle.

## Dependencies
Effect import identity, enclosing-function classification, Cache options/lookup recognition.

## Tests and examples
Positive request function: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No module-factory negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-cache-per-request`; local scope; scope/import context; Effect cache fleet, semantic phase; deterministic candidates: strong.

## Open questions
The heuristic treats any parameterized factory as request-scoped without call-site analysis.
