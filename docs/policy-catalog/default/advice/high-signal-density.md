# high-signal-density

## Classification
Derived fallback file-level default advice outcome.

## Active wiring
`defaultDerive` runs `highSignalDensity` over all reported named detections, then suppresses files already covered by specific file-level advice through `filterFallbackAdviceForUncoveredFiles`.

## Implementation sources
`packages/guidance/src/derive/highSignalDensity.ts`; `packages/guidance/src/preset/defaultDerive.ts`; `packages/guidance/src/preset/defaultSpecificAdvice.ts`; `packages/core/src/engine/derive/derive.ts`; `packages/core/src/engine/report/report.ts`.

## Intent
Escalate files with many heterogeneous/local findings to architectural restructuring instead of item-by-item cleanup.

## Detection boundary
Groups all reported named detections by file and emits at ten or more findings. Evidence contains total signals plus descending per-policy counts. After derivation, any file with specific file-level advice is removed.

## Exemptions and non-findings
Fewer than ten findings, all silent findings, and files covered by specific file advice do not appear. Directory/project advice does not suppress a dense file.

## Guidance
Restructure around the Effect runtime and state/lifecycle primitives rather than fixing each signal independently.

## Dependencies
All reported named findings, count summarization, and complete specific advice for fallback suppression.

## Tests and examples
Count/evidence unit coverage in `tests/advice.test.ts`; reported-only and suppression ordering in `tests/defaultDerive.test.ts`; pair in `packages/guidance/examples/high-signal-density/`; runner coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Proposed `lint-rule-high-signal-density`; file aggregate scope; requires normalized reported findings and prior specific-advice coverage; density fleet, fallback aggregation phase after specific advice; deterministic candidate generation should apply threshold and suppression before invoking the skill.

## Open questions
None identified.
