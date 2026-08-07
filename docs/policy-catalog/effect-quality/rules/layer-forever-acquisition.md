# layer-forever-acquisition

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeLayerForever.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Allow layer acquisition to complete while long-lived work remains owned by the layer scope.

## Detection boundary
Reports `Layer.effect`, `effectDiscard`, or `effectContext` whose acquisition argument contains `Effect.forever`, or `Stream.forever` plus a recognized Stream runner, without any nested `Effect.forkScoped`.

## Exemptions and non-findings
Acquisition containing `forkScoped`, finite effects, unrecognized runners, and long-lived work outside layer acquisition are quiet.

## Guidance
Fork with `Effect.forkScoped`, FiberSet, or FiberMap.

## Dependencies
Effect import identity, layer dual-call argument selection, subtree fold.

## Tests and examples
Positive Stream-never layer: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No `forkScoped` negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-layer-forever-acquisition`; local scope; import and nested-call context; Effect lifecycle fleet, semantic phase; deterministic candidates: strong.

## Open questions
Other nonterminating acquisition shapes are not recognized.
