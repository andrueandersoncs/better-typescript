# global-config-mutation

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-host product glob excludes repository tests.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeEnv.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Keep tests deterministic and isolated from global environment mutation.

## Detection boundary
Reports assignment or delete targets resolving to `process.env`, a nested property, or element access in files classified as test.

## Exemptions and non-findings
Reads, non-test/unclassified files, shadowed `process`, and mutations through helper aliases are quiet.

## Guidance
Use `ConfigProvider.fromUnknown` or a test configuration service.

## Dependencies
Architecture role, TypeScript symbol resolution, assignment-target helper.

## Tests and examples
Positive mutation: `tests/fixtures/effect-quality/tests/effect.spec.ts`; kind coverage: `tests/effectQuality.test.ts`. No delete/element/alias tests identified.

## Skill migration
Propose `lint-rule-effect-quality-global-config-mutation`; local scope; symbol and role context; Effect test-runtime fleet, semantic phase; deterministic candidates: strong.

## Open questions
Self-host Effect-quality wiring does not cover `tests/**`.
