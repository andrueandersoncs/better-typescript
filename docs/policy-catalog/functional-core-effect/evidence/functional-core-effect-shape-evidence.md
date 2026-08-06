# functional-core-effect-shape-evidence

## Classification
Silent multiplexed evidence policy for four functional-core shape advice kinds.

## Active wiring
Included with reported boundaries by `makeFunctionalCoreEffectWiring`; `functionalCoreEffectDerive` converts valid shape detections into file-level advice. Self-host uses the custom domain/root role policy.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/shapeEvidence.ts`; `packages/matchers/src/builtins/functionalCoreEffect/data.ts`; `packages/guidance/src/policies/functionalCoreShapeEvidence.ts`; `packages/guidance/src/functionalCoreEffect/advice.ts`; `packages/guidance/src/preset/functionalCoreEffectWiring.ts`.

## Intent
Measure application orchestrators, adapter/root file shape, and service surfaces while separating silent evidence from user-facing architectural advice.

## Detection boundary
Uses call subscriptions for application Effect orchestrators, class subscriptions for application/port pure services, and file subscriptions for adapter/root metrics. Each detection carries role plus branch, function, service, effectful-member, and transformation counts.

## Exemptions and non-findings
Unclassified/irrelevant roles and shapes below kind-specific thresholds emit nothing. Invalid payloads are ignored during derivation.

## Guidance
The evidence policy has generic silent prose; derivation supplies distinct titles, remediations, measurements, and per-kind examples.

## Dependencies
Workspace TypeScript program and role index, Effect/Context/composition import identity, function ownership, service surface typing, AST folds.

## Tests and examples
Exact detection metrics and advice outputs are asserted in `tests/functionalCoreEffect.test.ts` using `tests/fixtures/functional-core-effect`. Each kind has a dedicated pair under `packages/guidance/examples` and coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Propose `lint-evidence-functional-core-shapes` as runner infrastructure, not a user-facing rule; workspace scope producing file-local metrics; checker, roles, composition APIs, service types, and AST ownership context; functional-core shape fleet, candidate phase before advice; deterministic generation: complete for current thresholds.

## Open questions
The monolithic implementation should become one shared semantic index plus four independent skills; thresholds need parity fixtures before changing them.
