# layer-composition

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceLayers.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Make large Layer subgraphs named and intentional.

## Detection boundary
Emits for `Layer.mergeAll` in any classified non-test role and for `Layer.provideMerge` only in root files.

## Exemptions and non-findings
Tests, non-root `provideMerge`, `Layer.merge`, and other composition APIs are quiet. Functional-core owns non-root provisioning violations.

## Guidance
Name the layer subgraph and make exposed dependencies intentional.

## Dependencies
Architecture role and Effect Layer import identity.

## Tests and examples
Positive `Layer.mergeAll`: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No root `provideMerge` fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-layer-composition`; local scope; import and role context; Effect layers fleet, advice phase; deterministic candidates: complete.

## Open questions
No threshold distinguishes small intentional `mergeAll` uses from problematic subgraphs.
