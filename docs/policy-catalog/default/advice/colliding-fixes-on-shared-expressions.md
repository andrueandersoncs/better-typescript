# colliding-fixes-on-shared-expressions

## Classification
Derived file-level default advice outcome.

## Active wiring
`defaultSpecificAdvice` invokes `sideEffectLaundering` over all reported named detections; silent signals are excluded by `defaultNamedElements`.

## Implementation sources
`packages/guidance/src/derive/sideEffectLaundering.ts`; `packages/guidance/src/preset/defaultSpecificAdvice.ts`; `packages/core/src/engine/derive/derive.ts`.

## Intent
Detect repeated places where multiple rules target the same expression/line, indicating one expression is carrying incompatible responsibilities.

## Detection boundary
Groups reported findings by file, then by line. A line is a collision only when at least two distinct policy names occur there. Emits one file advice when at least two colliding lines exist; evidence lists sorted rule names per line and raw finding count.

## Exemptions and non-findings
One colliding line, multiple findings from one rule, collisions split across files, and all silent signals do not trigger advice. Column overlap is not considered.

## Guidance
Restructure/split the expression or anchor the contract with the consuming library's callback type instead of appeasing rules independently.

## Dependencies
All reported named detections with file and line locations; `byFile` and `collidingLines`.

## Tests and examples
Positive/negative unit coverage in `tests/advice.test.ts`; pair in `packages/guidance/examples/side-effect-laundering/`; runner coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Proposed `lint-rule-colliding-fixes-on-shared-expressions`; file aggregate scope; requires normalized reported findings and exact line locations; collision fleet, post-rule aggregation phase; deterministic candidate generation should calculate colliding files/lines and provide their rule evidence.

## Open questions
None identified.
