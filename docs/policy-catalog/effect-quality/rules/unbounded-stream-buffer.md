# unbounded-stream-buffer

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeStream.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Preserve backpressure and bounded memory in Stream pipelines.

## Detection boundary
Reports `Stream.buffer` direct/data-first calls whose options object at argument 0 or 1 contains literal `capacity: "unbounded"`.

## Exemptions and non-findings
Dynamic options, aliases, other unbounded spellings, and bounded capacities are quiet. No role filter applies.

## Guidance
Use natural backpressure or a bounded buffer strategy.

## Dependencies
Effect import identity and object-property syntax analysis.

## Tests and examples
Positive: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No bounded/dynamic negative fixtures identified.

## Skill migration
Propose `lint-rule-effect-quality-unbounded-stream-buffer`; local scope; import and literal-shape context; Effect streams fleet, semantic phase; deterministic candidates: complete.

## Open questions
None identified.
