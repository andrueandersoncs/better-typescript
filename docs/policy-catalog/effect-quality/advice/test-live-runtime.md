# test-live-runtime

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; repository self-host Effect-quality glob excludes tests.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceTestRuntime.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Require deliberate justification for live-runtime Effect tests.

## Detection boundary
In test files, emits for syntactic `it.live(...)` with identifier receiver `it`.

## Exemptions and non-findings
Non-test/unclassified files, aliased receivers, computed access, and all other test APIs are quiet; import identity is not checked.

## Guidance
Prefer `it.effect` unless live runtime behavior is the test subject.

## Dependencies
Architecture role and local call syntax.

## Tests and examples
Positive: `tests/fixtures/effect-quality/tests/effect.spec.ts`; coverage: `tests/effectQuality.test.ts`. No `it.effect` negative assertion identified.

## Skill migration
Propose `lint-rule-effect-quality-test-live-runtime`; local scope; syntax and role context; Effect test-runtime fleet, advice phase; deterministic candidates: complete.

## Open questions
Unlike `effect-test-style`, the detector does not verify `@effect/vitest` import identity.
