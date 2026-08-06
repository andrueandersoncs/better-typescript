# effect-test-style

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; the self-host Effect-quality glob excludes repository tests.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedHttpTestStyle.ts`; `packages/matchers/src/builtins/effectQuality/reportedHttpTestIt.ts`; `packages/matchers/src/builtins/effectQuality/reportedHttpTestEffect.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Run Effect-returning tests with the Effect-aware Vitest entry point.

## Detection boundary
In test files, reports `it`, `it.only/skip/todo/concurrent/sequential`, or `it.each(...)(...)` imported from `@effect/vitest` when the last function callback statically returns Effect.

## Exemptions and non-findings
`it.effect`, non-Effect callbacks, non-test roles, non-Effect Vitest imports, and callbacks whose return type cannot be confirmed are quiet.

## Guidance
Use `it.effect` for the correct runtime and deterministic services.

## Dependencies
Architecture role, TypeScript checker return types, `@effect/vitest` import identity, Effect type-symbol recognition.

## Tests and examples
Positive plain Effect test: `tests/fixtures/effect-quality/tests/effect.spec.ts`; kind coverage: `tests/effectQuality.test.ts`. `it.live` is advice, not a non-finding assertion for this rule.

## Skill migration
Propose `lint-rule-effect-quality-effect-test-style`; local scope; checker/import/role context; Effect test-runtime fleet, semantic phase; deterministic candidates: strong.

## Open questions
No dedicated tests cover modifiers, `each`, aliases, or false-return inference.
