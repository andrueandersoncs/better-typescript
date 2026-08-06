# domain-effect-program

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries`; self-host classifies only `packages/core/src/engine` as domain.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/importedMembers.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Keep the domain core pure instead of constructing Effect/async programs.

## Detection boundary
In domain files, reports imports/re-exports that actually use forbidden Effect runtime namespaces, global `Promise` type references, and `async` keywords. Namespace imports are scanned for actual forbidden member use.

## Exemptions and non-findings
Pure Effect namespaces such as Option, shadowed/local `Promise`, unused namespace bindings, type exports outside forbidden namespaces, and non-domain files are quiet.

## Guidance
Return plain immutable decisions; translate them into Effect operations in application code.

## Dependencies
Architecture role, TypeScript symbol/import/type identity, namespace-usage AST fold.

## Tests and examples
Positives and negatives: `tests/fixtures/functional-core-effect/src/domain/effectful.ts`, `barrelEffect.ts`, `namespaceEffect.ts`, `pure.ts`, `shadowedPromise.ts`, and `namespacePure.ts`; asserted in `tests/functionalCoreEffect.test.ts`. Dedicated pair: `packages/guidance/examples/functional-core-effect-boundaries/1`.

## Skill migration
Propose `lint-rule-functional-core-domain-effect-program`; local scope after project indexing; checker/import/role/type context; functional-core boundaries fleet, semantic phase; deterministic candidates: strong.

## Open questions
The forbidden namespace list is policy in code but not configurable through `FunctionalCoreEffectPolicy`.
