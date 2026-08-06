# effect-orchestrator

## Classification
Derived file-level functional-core shape advice.

## Active wiring
Silent `functional-core-effect-shape-evidence` plus `functionalCoreEffectDerive`; self-host active where custom role policy identifies application files (none in current self-host prefixes).

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/shapeEvidence.ts`; `packages/guidance/src/functionalCoreEffect/advice.ts`.

## Intent
Separate domain decisions from application Effect orchestration.

## Detection boundary
For application `Effect.gen`, `Effect.fn`, or `fnUntraced` callback bodies, emits when at least two distinct Context.Service tags are yielded and the body has at least two branch nodes or three qualifying non-Effect transformation calls. Nested function ownership and calls beneath yields are excluded from metrics.

## Exemptions and non-findings
Other roles/APIs, fewer than two services, and low decision/transformation volume are quiet.

## Guidance
Read through ports, call a pure function over plain data, then execute decisions through ports.

## Dependencies
Architecture role, Effect/Context import identity, TypeScript service-tag recognition, function-owned AST metrics.

## Tests and examples
Branch and transformation positives: `tests/fixtures/functional-core-effect/src/application/orchestrator.ts` and `tests/fixtures/functional-core-effect/src/application/transformOrchestrator.ts`; thresholds asserted in `tests/functionalCoreEffect.test.ts`. Dedicated pair: `packages/guidance/examples/effect-orchestrator/1` and aggregate example test.

## Skill migration
Propose `lint-rule-functional-core-effect-orchestrator`; local scope; checker/role/service-yield/metric context; functional-core shape fleet, advice phase; deterministic candidate generation: complete.

## Open questions
Transformation counting classifies all non-Effect calls, including infrastructure or trivial helpers.
