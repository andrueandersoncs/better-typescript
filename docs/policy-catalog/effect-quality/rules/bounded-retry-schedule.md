# bounded-retry-schedule

## Classification
Reported Effect-quality rule with comment waiver.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeRetry.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Require an operational bound on retries unless forever retry is locally documented.

## Detection boundary
Reports `Effect.retry` when the extracted options/schedule lacks recognized bounds (`recurs`, `upTo`, `times`, count, while/until, intersect, or bounded combinations). Supports direct, curried, object, and pipeline-compatible call shapes.

## Exemptions and non-findings
Recognized bounded schedules/options and calls with leading comments matching `unbounded`, `forever-ok`, `allow-forever`, or `effect-quality-allow-unbounded-retry` are quiet.

## Guidance
Use `recurs` or `upTo` to make retries bounded.

## Dependencies
Effect import identity, Schedule-expression recursion, object-property analysis, leading comments.

## Tests and examples
Positive `Schedule.forever`: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No explicit bounded or waiver fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-bounded-retry-schedule`; local scope; import/call/comment context; Effect config/retry fleet, semantic phase; deterministic candidates: strong.

## Open questions
The waiver vocabulary is regex-based and not structurally tied to a standard directive.
