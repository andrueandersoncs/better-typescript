# systemic-hotspots

## Classification
Second-order derived project-level default advice outcome.

## Active wiring
`defaultDerive` builds it from emitted `hot-subsystem` advice and fallback-suppressed `high-signal-density` advice, then appends it last.

## Implementation sources
`packages/guidance/src/systemicHotspots/systemicHotspots.ts`; `packages/guidance/src/systemicHotspots/data.ts`; `packages/guidance/src/preset/defaultDerive.ts`; `packages/core/src/engine/report/report.ts`.

## Intent
Recognize when a hot subsystem and several remaining dense files require a top-down migration campaign.

## Detection boundary
Emits one project advice when there is at least one `hot-subsystem` advice and at least two `high-signal-density` advice items after file-level fallback suppression. Evidence records both advice counts.

## Exemptions and non-findings
No hot subsystem, fewer than two surviving dense files, or dense files suppressed by specific file advice does not trigger systemic advice.

## Guidance
Rewrite the hot subsystem shape first, establish the architectural pattern, then sweep remaining dense files.

## Dependencies
Final hot-subsystem advice and fallback-suppressed high-signal-density advice; this outcome consumes advice, not raw findings.

## Tests and examples
Positive/negative second-order coverage in `tests/advice.test.ts`; suppression-order coverage in `tests/defaultDerive.test.ts`; pair in `packages/guidance/examples/systemic-hotspots/`; runner coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Proposed `lint-advice-systemic-hotspots`; workspace/project scope; requires finalized upstream advice after suppression; systemic fleet, final aggregate phase; deterministic candidate generation should enforce upstream ordering and the 1+2 thresholds before invocation.

## Open questions
None identified.
