# test-clock-for-time

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; repository self-host Effect-quality glob excludes tests.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceTestRuntime.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Use deterministic virtual time for time-sensitive tests.

## Detection boundary
In test files, emits for recognized Effect sleep/timeout/retry or Schedule exponential/fibonacci calls when the source file contains no recognized TestClock reference/API.

## Exemptions and non-findings
Non-tests, files with any recognized TestClock usage, and time APIs outside the lists are quiet.

## Guidance
Fork time-dependent work and advance TestClock.

## Dependencies
Architecture role, Effect/Schedule/TestClock import identity, whole-file TestClock scan.

## Tests and examples
Positive sleep: `tests/fixtures/effect-quality/tests/effect.spec.ts`; coverage: `tests/effectQuality.test.ts`. No TestClock suppression fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-test-clock-for-time`; local scope; import and role context; Effect test-runtime fleet, advice phase; deterministic candidates: strong.

## Open questions
Any TestClock use in the file suppresses every time-use finding, without association to a specific test.
