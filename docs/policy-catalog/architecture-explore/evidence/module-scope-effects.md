# module-scope-effects

## Classification

Silent node-level FP architecture evidence policy.

## Active wiring

`architectureExploreFpPolicies`; enabled by the combined and FP Architecture Explore wirings.

## Implementation sources

- Guidance: `packages/guidance/src/policies/moduleScopeEffects.ts`
- Matcher: `packages/matchers/src/builtins/moduleScopeEffects.ts`
- Composition-root classification: `packages/matchers/src/support/compositionRoot.ts`

## Intent

Measure eager I/O and Effect runtime execution outside an allowed application boundary.

## Detection boundary

In non-test, non-composition-root files, match Effect runtime calls `runSync`, `runPromise`,
`runFork`, `runSyncExit`, and `runPromiseExit`. Also match module-scope calls rooted in selected
Node effectful modules, `process`, or `ts.sys`; module-scope I/O must occur in a top-level expression
or variable statement outside function, class, and namespace scopes.

## Exemptions and non-findings

Skip tests and composition roots. Built-in I/O inside functions is not module-scope evidence.
Effect runtime calls remain evidence even when nested inside behaviour.

## Guidance

Use concentrated facts to decide whether runtime work needs a composition root or injectable seam.

## Dependencies

Consumed by hard-to-test hotspot.

## Tests and examples

- `tests/architectureEvidenceFp.test.ts`
- `tests/architectureExploreDerive.test.ts`
- `packages/guidance/examples/hard-to-test-hotspot/`

## Skill migration

Retain symbol/import classification as deterministic candidate support. Required scope is file plus
role classification; run in the FP evidence phase.

## Open questions

Whether runtime execution inside a function should remain grouped under the module-scope policy name.
