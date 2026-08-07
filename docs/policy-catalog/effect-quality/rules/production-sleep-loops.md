# production-sleep-loops

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeSleep.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Express perpetual pacing with Schedule rather than manual sleep loops.

## Detection boundary
Reports imported `Effect.sleep` calls nested in `while (true)` or `for (;;)` in any classified non-test role.

## Exemptions and non-findings
Finite/conditional loops, tests, unclassified files, and sleep outside the recognized loops are quiet.

## Guidance
Use an Effect Schedule with `Effect.repeat`.

## Dependencies
Architecture role, Effect import identity, ancestor scan.

## Tests and examples
Positive worker: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No finite-loop negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-production-sleep-loops`; local scope; syntax/import/role context; Effect runtime fleet, semantic phase; deterministic candidates: complete.

## Open questions
Equivalent recursive or conditionally perpetual loops are outside the current detector.
