# config-secret-redaction

## Classification
Reported Effect-quality rule with configurable key classification.

## Active wiring
`effect-quality-rules` via default `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaSafety.ts`; `packages/matchers/src/builtins/effectQuality/policy.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Prevent credentials read through `Config.string` from being exposed as plain strings.

## Detection boundary
Reports imported `Config.string` calls whose first argument is a string literal accepted by `policy.sensitiveConfigKey`; the default matches API keys, tokens, secrets, passwords, and credentials.

## Exemptions and non-findings
Dynamic keys, non-sensitive keys, `Config.redacted`, and custom policy rejections are quiet.

## Guidance
Use `Config.redacted` so operational values cannot be accidentally disclosed.

## Dependencies
TypeScript checker/import identity and `EffectQualityPolicy.sensitiveConfigKey`.

## Tests and examples
Positive `API_TOKEN`: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No redacted/custom-policy tests identified.

## Skill migration
Propose `lint-rule-effect-quality-config-secret-redaction`; local scope; import and policy semantics; Effect config/retry fleet, semantic phase; deterministic candidates: strong.

## Open questions
The skill needs a portable representation of the configurable sensitive-key predicate.
