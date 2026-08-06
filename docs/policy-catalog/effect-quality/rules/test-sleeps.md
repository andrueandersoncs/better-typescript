# test-sleeps

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted product sources do not include `tests/**` for this wiring.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeSleep.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Remove nondeterministic wall-clock synchronization from tests.

## Detection boundary
Reports direct or pipe-stage imported `Effect.sleep` uses in files classified as test.

## Exemptions and non-findings
Non-test and unclassified files, shadowed APIs, and other time operations are quiet.

## Guidance
Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook.

## Dependencies
Architecture role, Effect import identity, direct/pipe-stage call helper.

## Tests and examples
Positive: `tests/fixtures/effect-quality/tests/effect.spec.ts`; kind coverage: `tests/effectQuality.test.ts`. No pipe-stage or deterministic-sync negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-test-sleeps`; local scope; import and role context; Effect test-runtime fleet, semantic phase; deterministic candidates: strong.

## Open questions
Self-host configuration does not currently apply Effect-quality wiring to repository tests.
