# pipeline-hostile-module

## Classification
Derived file-level default advice outcome.

## Active wiring
`defaultSpecificAdvice` selects `no-nested-calls` and silent `prefer-curried-data-last-functions` detections and invokes `pipelineHostile`.

## Implementation sources
`packages/guidance/src/pipelineHostile/pipelineHostile.ts`; `packages/guidance/src/pipelineHostile/data.ts`; `packages/guidance/src/preset/defaultSpecificAdvice.ts`; `packages/matchers/src/builtins/noNestedCalls.ts`; `packages/matchers/src/builtins/preferCurriedDataLastFunctions.ts`.

## Intent
Identify modules whose function signatures force inside-out nested composition.

## Detection boundary
Uses unique file paths from `no-nested-calls`. Emits when the same file has at least five nested-call detections and at least five uncurried/data-last detections; evidence contains both counts.

## Exemptions and non-findings
Either count below five is clean; uncurried findings in another file do not combine; files with only uncurried findings are not candidate paths. Curried calls producing functions and first arguments of standalone `pipe` are already excluded by `no-nested-calls`.

## Guidance
Curry configuration ahead of the data argument, then rewrite nested call sites into pipelines.

## Dependencies
Complete `no-nested-calls` findings plus evidence-only `prefer-curried-data-last-functions` findings.

## Tests and examples
Threshold/unit coverage in `tests/advice.test.ts`; pair in `packages/guidance/examples/pipeline-hostile/`; runner coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Proposed `lint-rule-pipeline-hostile-module`; file aggregate scope backed by workspace semantic rules; requires normalized counts from both inputs; pipeline fleet, post-rule aggregation phase; deterministic candidate generation can group and threshold exactly before invoking remediation reasoning.

## Open questions
None identified.
