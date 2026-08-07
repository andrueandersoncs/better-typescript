# unbounded-stream-collect

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeStream.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Avoid materializing potentially unbounded production streams.

## Detection boundary
Reports direct or pipe-stage `Stream.runCollect` in classified non-test files; it does not prove the upstream stream is unbounded.

## Exemptions and non-findings
Tests, unclassified files, and other stream runners are quiet.

## Guidance
Consume incrementally with `runForEach`, `runDrain`, or a bounded `take`.

## Dependencies
Architecture role and Effect import/pipe-stage identity.

## Tests and examples
Positive `Stream.never` collection: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`.

## Skill migration
Propose `lint-rule-effect-quality-unbounded-stream-collect`; local scope; import and role context; Effect streams fleet, semantic phase; deterministic candidates: strong.

## Open questions
The rule message says unbounded, but detection reports every production `runCollect` regardless of upstream boundedness.
