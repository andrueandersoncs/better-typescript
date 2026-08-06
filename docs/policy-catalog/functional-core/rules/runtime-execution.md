# runtime-execution

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries`; self-host permits runtime execution in custom-classified CLI roots.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/effectRuntimeApis.ts`; `packages/matchers/src/builtins/functionalCoreEffect/effectApiMembers.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Run Effect programs only at composition roots.

## Detection boundary
In classified non-test, non-root files, reports Effect `run*` APIs, ManagedRuntime run methods, runtime handoffs used as pipe stages, and platform `runMain` from node/bun/deno/browser packages.

## Exemptions and non-findings
Root/test/unclassified files, shadowed methods, and runtime APIs outside the catalog are quiet.

## Guidance
Return Effect with requirements visible; provide and run once at bootstrap.

## Dependencies
Architecture role, TypeScript import/member identity, ManagedRuntime receiver typing, pipe-stage recognition.

## Tests and examples
Direct, managed, piped, and browser positives: `tests/fixtures/functional-core-effect/src/application/runtime.ts` and `tests/fixtures/functional-core-effect/src/application/barrelRuntime.ts`; root/test non-findings: `tests/fixtures/functional-core-effect/src/main.ts` and `tests/fixtures/functional-core-effect/tests/allowed.spec.ts`; asserted in `tests/functionalCoreEffect.test.ts`.

## Skill migration
Propose `lint-rule-functional-core-runtime-execution`; local scope; checker/import/receiver/role context; functional-core runtime fleet, semantic phase; deterministic candidates: strong.

## Open questions
Platform runtime packages are hard-coded rather than policy-configured.
