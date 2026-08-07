# port-live-implementation

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries`; active where role policy identifies port files.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/effectServiceApis.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Keep port modules declarative; place live implementations in adapters.

## Detection boundary
In port files, reports `Layer.effect`/`Layer.succeed` calls, Context.Service class/functional declarations with recognized live `make` configuration, and embedded static layer members.

## Exemptions and non-findings
Declarative Context.Service contracts without live config, all non-port roles, and unrecognized construction forms are quiet.

## Guidance
Declare the service in the port and export Layer implementations from adapters.

## Dependencies
Architecture role, Effect Layer/Context.Service import identity, service configuration/property analysis.

## Tests and examples
Positive class, layer property/calls, and functional service: `tests/fixtures/functional-core-effect/src/ports/badPort.ts`; allowed contract: `tests/fixtures/functional-core-effect/src/ports/orderPort.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-port-live-implementation`; local scope; checker/import/service-shape/role context; functional-core ports fleet, semantic phase; deterministic candidates: strong.

## Open questions
None identified.
