# imperative-core

## Classification
Aggregate file-level functional-core advice derived from reported boundary detections.

## Active wiring
`functionalCoreEffectDerive` consumes `functional-core-effect-boundaries`; self-host active for custom-classified `packages/core/src/engine` domain files.

## Implementation sources
`packages/guidance/src/functionalCoreEffect/advice.ts`; `packages/matchers/src/builtins/functionalCoreEffect/data.ts`; `packages/guidance/src/preset/functionalCoreEffectWiring.ts`.

## Intent
Highlight core modules where several independent boundary failures indicate an imperative design concentration.

## Detection boundary
Groups valid boundary detections by file, retains domain/application roles, deduplicates kinds, and emits once when at least two distinct boundary kinds occur. Evidence counts each kind.

## Exemptions and non-findings
Adapter/port/root/test detections, files with only one distinct kind, duplicate detections of one kind, invalid payloads, and missing boundary signals are quiet.

## Guidance
Extract a pure decision function, express external needs as ports, and leave Layer/runtime selection at the root.

## Dependencies
Complete boundary signal set, stable role/kind payloads, file grouping; no new AST scan.

## Tests and examples
Positives in `tests/fixtures/functional-core-effect/src/application/runtime.ts` and `tests/fixtures/functional-core-effect/src/domain/latchState.ts`; asserted in `tests/functionalCoreEffect.test.ts`. Dedicated pair: `packages/guidance/examples/imperative-core/1` and aggregate example test.

## Skill migration
Propose `lint-rule-functional-core-imperative-core`; workspace scope aggregating findings by file; normalized boundary-kind and role context; functional-core aggregate fleet, post-boundary phase; deterministic candidate generation: complete.

## Open questions
All boundary kinds have equal weight; no suppression handles multiple findings that stem from one underlying construct.
