# service-locator

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries`; self-host active in classified non-root paths.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/importedMembers.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Require precise services through Effect’s requirement channel instead of passing a context/runtime bag.

## Detection boundary
In classified non-test, non-root files, reports Effect `context`/`contextWith`, Context `get*` calls, and type references to `Context.Context` or `ManagedRuntime`, following local type aliases recursively.

## Exemptions and non-findings
Root/test/unclassified files, yielding individual Context.Service tags, Reference overrides, and unrelated aliases are quiet.

## Guidance
Yield the precise service requirement where used.

## Dependencies
Architecture role, TypeScript import/type identity and alias traversal.

## Tests and examples
Call/type/alias positives: `tests/fixtures/functional-core-effect/src/application/runtime.ts` and `tests/fixtures/functional-core-effect/src/ports/badPort.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-service-locator`; cross-file scope; checker/import/type-alias/role context; functional-core runtime fleet, semantic phase; deterministic candidates: strong.

## Open questions
Structurally equivalent custom dependency bags are outside the current boundary.
