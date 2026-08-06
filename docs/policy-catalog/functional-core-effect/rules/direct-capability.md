# direct-capability

## Classification
Reported functional-core architecture boundary rule with configurable capability prefixes.

## Active wiring
`functional-core-effect-boundaries`; self-host custom roles apply it to classified core/CLI files.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/capabilitySubjects.ts`; `packages/matchers/src/builtins/functionalCoreEffect/movedPlatformCapabilities.ts`; `packages/matchers/src/builtins/functionalCoreEffect/policy.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Access concrete platform capabilities only through adapters at declared seams.

## Detection boundary
In domain/port/application roles, reports runtime imports/re-exports matching capability module prefixes or moved Effect platform capabilities, plus recognized ambient/global capability calls, constructors, and properties not already represented by an imported callee.

## Exemptions and non-findings
Adapter/root/test roles, type-only capability imports/exports, shadowed ambient names, and APIs outside configured prefixes/capability recognition are quiet.

## Guidance
Declare a domain-owned Context.Service port and implement it with an adapter Layer.

## Dependencies
Architecture role, TypeScript symbols/import resolution, configurable module prefixes, ambient/moved-capability catalogs.

## Tests and examples
Positives: `tests/fixtures/functional-core-effect/src/application/capabilities.ts`; asserted in `tests/functionalCoreEffect.test.ts`. No configurable-prefix fixture identified.

## Skill migration
Propose `lint-rule-functional-core-direct-capability`; cross-file scope; role/import/global-symbol policy context; functional-core capabilities fleet, semantic phase; deterministic candidates: strong.

## Open questions
The skill needs a portable capability-prefix/catalog configuration.
