# escaping-runtime-state

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries`; active in all classified non-test roles.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/lifecycleBoundaries.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Keep mutable Effect runtime state owned by a Layer/service scope.

## Detection boundary
Reports imported `Ref.makeUnsafe`, `SynchronizedRef.makeUnsafe`, `Latch.makeUnsafe`, and `Semaphore.makeUnsafe` when no scoped lifecycle ancestor or source-file-scoped function contains the call.

## Exemptions and non-findings
Tests/unclassified files, safe constructors, calls inside recognized scoped lifecycle/source scope, and other runtime state types are quiet.

## Guidance
Use safe constructors while building a `Layer.effect` service and keep handles private.

## Dependencies
Architecture role, Effect import identity, lifecycle/source-scope analysis.

## Tests and examples
Application/domain/adapter positives and scoped negatives: `tests/fixtures/functional-core-effect/src/application/runtime.ts`, `tests/fixtures/functional-core-effect/src/domain/latchState.ts`, and `tests/fixtures/functional-core-effect/src/adapters/foreign.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-escaping-runtime-state`; local scope; import/role/lifecycle context; functional-core adapter-lifecycle fleet, semantic phase; deterministic candidates: strong.

## Open questions
Queue, PubSub, and SubscriptionRef unsafe/escaping constructors are not part of the state constructor map.
