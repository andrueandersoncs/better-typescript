# schema-record-interface

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaRecordOptional.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Pair named `Schema.Struct` records with an explicit decoded interface.

## Detection boundary
Reports an identifier variable initialized directly with imported `Schema.Struct` unless the same file has a same-name interface extending `Schema.Type<typeof Name>` or `Type<typeof Name>`.

## Exemptions and non-findings
Destructured bindings, indirect/composed schema initializers, cross-file interfaces, type aliases, and recognized same-file interface pairs are quiet.

## Guidance
Export the decoded interface beside the schema declaration.

## Dependencies
TypeScript checker/import identity plus a whole-source-file statement scan.

## Tests and examples
Positive `User` and paired non-finding `InputSchema`/`Input` shapes appear in `tests/fixtures/effect-quality/src/application/rules.ts`; kind presence only is asserted in `tests/effectQuality.test.ts`.

## Skill migration
Propose `lint-rule-effect-quality-schema-record-interface`; local scope; declaration/import semantics; Effect schema/safety fleet, semantic phase; deterministic file index: complete.

## Open questions
The fixture’s names are not actually paired (`Input` versus `InputSchema`), so explicit accepted-pair coverage was not identified.
