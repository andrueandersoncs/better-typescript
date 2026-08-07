# schema-error-class

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaErrorClass.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Use schema-tagged typed errors instead of hand-rolled Error/Data classes.

## Detection boundary
Reports named classes not already extending recognized Schema error APIs when they have `_tag` or extend `Data.TaggedError`/`Data.Error` and also look error-like by name, built-in `Error` heritage, or Data heritage.

## Exemptions and non-findings
Recognized `Schema.TaggedErrorClass`, `Schema.ErrorClass`, and `Schema.TaggedError` subclasses, anonymous classes, and classes without both hand-rolled and error-like signals are quiet.

## Guidance
Use `Schema.TaggedErrorClass` and preserve operation context at boundaries.

## Dependencies
TypeScript checker/import identity, heritage and property-name analysis.

## Tests and examples
Positive `AppError`: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No accepted Schema error fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-schema-error-class`; local scope; class/import semantics; Effect schema/safety fleet, semantic phase; deterministic candidates: strong.

## Open questions
No tests pin behavior for plain built-in Error subclasses without `_tag`.
