# pure-service

## Classification
Derived file-level functional-core shape advice.

## Active wiring
Silent `functional-core-effect-shape-evidence` plus `functionalCoreEffectDerive`; active in application and port roles.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/shapeEvidence.ts`; `packages/matchers/src/builtins/functionalCoreEffect/effectServiceApis.ts`; `packages/guidance/src/functionalCoreEffect/advice.ts`.

## Intent
Avoid Context.Service seams for purely deterministic function collections without demonstrated variation.

## Detection boundary
Inspects application/port Context.Service classes via explicit service type or recognized `make: Effect.succeed/sync` object. Emits when there is at least one callable property, every property is callable, and no callable return type renders as Effect/Stream/Channel/Sink/Ref/Queue/PubSub.

## Exemptions and non-findings
Other roles, surfaces with data properties, effectful members, unrecognized make forms such as scoped `Effect.gen`, and empty services are quiet.

## Guidance
Prefer a pure function or explicit function parameter unless real adapters prove the seam varies.

## Dependencies
Architecture role, Context.Service config recognition, TypeScript service surface and rendered return types.

## Tests and examples
Positives and scoped non-finding: `tests/fixtures/functional-core-effect/src/application/effectPureService.ts`, `tests/fixtures/functional-core-effect/src/application/orchestrator.ts`, and `tests/fixtures/functional-core-effect/src/ports/badPort.ts`; asserted in `tests/functionalCoreEffect.test.ts`. Dedicated pair: `packages/guidance/examples/pure-service/1`.

## Skill migration
Propose `lint-rule-functional-core-pure-service`; local scope; checker/role/service-surface context plus variation judgment; functional-core shape fleet, advice phase; deterministic candidates plus agent validation: partial.

## Open questions
The implementation cannot establish whether multiple real adapters justify the seam.
