# unscoped-resource

## Classification
Reported functional-core architecture boundary rule with configurable resource heuristics.

## Active wiring
`functional-core-effect-boundaries`; active in adapter/root files.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/lifecycleBoundaries.ts`; `packages/matchers/src/builtins/functionalCoreEffect/policy.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Acquire external resources in an Effect-managed lifecycle.

## Detection boundary
In adapter/root files, reports calls/new expressions recognized by configured resource factory names or result-type suffixes when neither a scoped lifecycle ancestor nor a source-file-scoped factory is found.

## Exemptions and non-findings
`acquireRelease`/`acquireDisposable` and other recognized scope ancestors, source-file-scoped functions, nonresource shapes, and other roles are quiet.

## Guidance
Pair acquire/release and expose the scoped implementation through a Layer.

## Dependencies
Architecture role, TypeScript types/imports, configurable resource names/suffixes, lifecycle/source-scope analysis.

## Tests and examples
Unscoped constructor/factory plus managed/disposable negatives: `tests/fixtures/functional-core-effect/src/adapters/foreign.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-unscoped-resource`; cross-file scope; checker/role/resource-policy/lifecycle context; functional-core adapter-lifecycle fleet, semantic phase; deterministic candidates: strong.

## Open questions
The meaning and completeness of `hasSourceFileScope` should be parity-tested independently during migration.
