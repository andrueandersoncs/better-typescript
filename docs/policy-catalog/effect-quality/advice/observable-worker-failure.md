# observable-worker-failure

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceWorkers.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Make skipped worker/item failures observable or explicitly documented.

## Detection boundary
In production roles, emits for imported `Effect.ignore`/`ignoreCause` when the enclosing function contains no generic logger-looking call.

## Exemptions and non-findings
Tests/nonproduction roles, other suppression APIs, and any nearby method/bare call with logger-like name are quiet.

## Guidance
Log expected failures or make the skip policy explicit at the worker boundary.

## Dependencies
Architecture role, Effect import identity, enclosing-function logging-name scan.

## Tests and examples
Positive `Effect.ignore`: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No logged suppression fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-observable-worker-failure`; local scope; role/import/function context; Effect lifecycle fleet, advice phase; deterministic candidates plus policy review: partial.

## Open questions
Any logger-named call suppresses advice regardless of whether it observes this failure.
