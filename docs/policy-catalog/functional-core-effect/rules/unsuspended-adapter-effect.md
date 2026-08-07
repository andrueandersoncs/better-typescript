# unsuspended-adapter-effect

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries`; active in files classified as adapter or root.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/capabilitySubjects.ts`; `packages/matchers/src/builtins/functionalCoreEffect/lifecycleBoundaries.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Suspend eager foreign operations before composing them into Effect.

## Detection boundary
In adapter/root files, reports recognized capability calls, constructors, or ambient property access with no ancestor suspension boundary (`Effect.sync`, try/tryPromise/callback family, and recognized wrappers).

## Exemptions and non-findings
Capabilities under recognized suspension, non-adapter/root roles, unrecognized foreign APIs, and shadowed ambient names are quiet.

## Guidance
Wrap lazy foreign work with `Effect.sync`, `try`, `tryPromise`, or `callback`; `Effect.succeed` is not suspension.

## Dependencies
Architecture role, capability policy/catalog, TypeScript symbols, ancestor suspension analysis.

## Tests and examples
Eager and suspended file reads/requests: `tests/fixtures/functional-core-effect/src/adapters/foreign.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-unsuspended-adapter-effect`; local scope; checker/capability/role/lifecycle context; functional-core adapter-lifecycle fleet, semantic phase; deterministic candidates: strong.

## Open questions
Custom suspension helpers are not recognized unless their internal AST remains an ancestor.
