# dependency-provisioning

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries`; self-host permits provisioning in custom-classified CLI roots.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/effectServiceApis.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Choose and provide live implementations only at composition roots.

## Detection boundary
In classified non-test, non-root files, reports Effect `provide*` except recognized `Context.Reference` overrides, Layer `provide`/`provideMerge`, `ManagedRuntime.make`, and `.layer` access on a symbol declared as Context.Service.

## Exemptions and non-findings
Root/test/unclassified files, Reference overrides, unrelated `.layer` properties, and provisioning APIs outside the catalog are quiet.

## Guidance
Keep the R channel open and compose Layers at application startup.

## Dependencies
Architecture role, Effect import identity, Context.Service declaration resolution, Reference override recognition.

## Tests and examples
Positives and Reference negatives: `tests/fixtures/functional-core-effect/src/application/runtime.ts`; port Layer provisioning: `tests/fixtures/functional-core-effect/src/ports/badPort.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-dependency-provisioning`; cross-file scope; checker/import/service-declaration/role context; functional-core runtime fleet, semantic phase; deterministic candidates: strong.

## Open questions
Custom service factory conventions are not recognized.
