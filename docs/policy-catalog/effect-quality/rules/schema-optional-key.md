# schema-optional-key

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaRecordOptional.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Represent absent object keys with `Schema.optionalKey` unless explicit `undefined` is contractual.

## Detection boundary
Reports a `Schema.optional` property assignment when any same-file interface or object type alias has an optional property with the same field name and no explicit `undefined` in its type.

## Exemptions and non-findings
Fields whose matching type includes `undefined`, missing same-file type evidence, computed/unrecognized names, and `Schema.optionalKey` are quiet. Matching is by field name, not schema/type identity.

## Guidance
Use `optionalKey` for absent JSON keys; reserve `optional` for explicit `undefined`.

## Dependencies
TypeScript syntax/import identity and file-wide type-declaration scan.

## Tests and examples
Positive fixture: `email` in `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No explicit-undefined negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-schema-optional-key`; local scope; schema-call and type-syntax context; Effect schema/safety fleet, semantic phase; deterministic file index: complete.

## Open questions
Field-name-only correlation may join unrelated schemas and interfaces.
