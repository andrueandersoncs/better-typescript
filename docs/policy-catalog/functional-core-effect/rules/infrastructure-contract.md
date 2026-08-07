# infrastructure-contract

## Classification
Reported functional-core architecture boundary rule with configurable capability/resource catalogs.

## Active wiring
`functional-core-effect-boundaries`; active where role policy identifies port files.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/importedMembers.ts`; `packages/matchers/src/builtins/functionalCoreEffect/policy.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Prevent ports from exposing infrastructure or mutable runtime handles.

## Detection boundary
For top-level exported type references in port files, reports global Promise; Effect state/runtime families; types from configured capability modules; or imported type names ending in Client/Connection/Pool/Driver/Transport/Database. Local aliases are followed recursively.

## Exemptions and non-findings
Non-port/nonexported references, allowed Effect/Stream/domain types, local Promise shadows, nonmatching resources, and unresolved aliases are quiet.

## Guidance
Expose domain values/errors, Effect, or Stream; keep SDK clients and mutable handles private.

## Dependencies
Architecture role, TypeScript type symbols/alias graph, capability prefixes and resource suffixes.

## Tests and examples
Promise, Ref, SDK client positives and alias coverage: `tests/fixtures/functional-core-effect/src/ports/badPort.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-infrastructure-contract`; cross-file scope; checker/export/type-alias/role/policy context; functional-core ports fleet, semantic phase; deterministic candidates: strong.

## Open questions
Structural infrastructure types without imported names/suffixes are not detected.
