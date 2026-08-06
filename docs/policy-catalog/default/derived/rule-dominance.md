# rule-dominance

## Classification
Derived project-level default advice outcome; rendered title is `one rule dominates the run`.

## Active wiring
`defaultDerive` runs `ruleDominance` over all reported named detections and emits it before systemic advice.

## Implementation sources
`packages/guidance/src/derive/ruleDominance.ts`; `packages/guidance/src/preset/defaultDerive.ts`; `packages/core/src/engine/derive/derive.ts`.

## Intent
Turn a widespread dominant rule into one planned mechanical migration.

## Detection boundary
Requires at least 25 total findings. A policy is dominant when it owns at least 40% of all findings and appears in at least five distinct files. Emits one project advice with total signals and all qualifying policies sorted by count/name.

## Exemptions and non-findings
Runs below 25 findings, rules below 40% share, and rules spread across fewer than five files do not trigger advice. Silent findings are excluded upstream.

## Guidance
Plan one codemod/mechanical migration and unified review instead of file-by-file edits.

## Dependencies
All reported named findings, counts by policy, and distinct files by policy.

## Tests and examples
Threshold/share/spread positive coverage in `tests/advice.test.ts`; pair in `packages/guidance/examples/rule-dominance/`; runner coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Proposed `lint-advice-rule-dominance`; workspace/project scope; requires complete normalized reported findings; dominance fleet, post-rule aggregation phase; deterministic candidate generation can reproduce total/share/spread qualification exactly.

## Open questions
The outcome name differs from its rendered title; the canonical migrated skill/output name needs confirmation.
