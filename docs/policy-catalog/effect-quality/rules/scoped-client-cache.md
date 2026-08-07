# scoped-client-cache

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeCacheLifecycle.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Keep scoped clients outside Cache lookup functions and share them through a layer.

## Detection boundary
Reports `Effect.provide*`, `Layer.build`, or `Layer.effect`/`effectDiscard`/`effectContext` calls nested inside a recognized `Cache.make`/`makeWith` lookup function.

## Exemptions and non-findings
The same APIs outside Cache lookup, unrecognized lookup shapes, and other acquisition APIs are quiet.

## Guidance
Acquire the client once in the owning layer; make lookup a plain call.

## Dependencies
Effect import identity, Cache lookup extraction, ancestor traversal.

## Tests and examples
Positive `Layer.build` lookup: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`.

## Skill migration
Propose `lint-rule-effect-quality-scoped-client-cache`; local scope; call/import/ancestor context; Effect cache fleet, semantic phase; deterministic candidates: strong.

## Open questions
The matcher detects acquisition/provisioning shapes, not whether the acquired value is actually a client.
