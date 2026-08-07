# retry-without-jitter

## Classification
Derived file-level Effect-quality advice from silent evidence.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceConfigRetry.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Avoid synchronized retry storms by jittering backoff schedules.

## Detection boundary
In classified non-test files, emits for `Effect.retry`/`retryOrElse` when the extracted schedule subtree contains `Schedule.exponential` or `fibonacci` but no `Schedule.jittered`.

## Exemptions and non-findings
Tests, non-backoff schedules, jittered schedules, and unrecognized schedule positions are quiet.

## Guidance
Add `Schedule.jittered` to the bounded backoff schedule.

## Dependencies
Architecture role, Effect/Schedule import identity, retry argument extraction, subtree scan.

## Tests and examples
Positive exponential retry: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No jittered negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-retry-without-jitter`; local scope; import and schedule-tree context; Effect config/retry fleet, advice phase; deterministic candidates: strong.

## Open questions
None identified.
