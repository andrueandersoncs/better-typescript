# schema-class-models

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaClassModel.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Keep ordinary schema-backed data declarative rather than class-based.

## Detection boundary
Reports classes extending imported `Schema.Class`/`Schema.TaggedClass`, and direct calls to those APIs whose first argument is fields, an identifier, or a call.

## Exemptions and non-findings
Other Schema class APIs and calls without the recognized first-argument shape are quiet. Imported-symbol identity is required.

## Guidance
Use `Schema.Struct` or tagged schema variants and decode at boundaries.

## Dependencies
TypeScript checker; Effect import identity and class-heritage helpers.

## Tests and examples
Positive fixture: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. Shared package example is not kind-specific.

## Skill migration
Propose `lint-rule-effect-quality-schema-class-models`; local scope; import and heritage semantics; Effect schema/safety fleet, semantic phase; deterministic checker-backed candidates: strong.

## Open questions
No dedicated negative tests for permitted Schema model variants identified.
