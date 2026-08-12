# process-environment

## Classification

Reported Effect-quality compatibility rule.

## Active wiring

`effect-quality-rules` via `effectQualityWiring`; self-hosted for classified `packages/*/src/**` files. The default fleet also exposes the standalone `process-environment` policy for unclassified production files.

## Implementation sources

- `packages/matchers/src/builtins/effectQuality/effectQualityRuleData.ts`
- `packages/matchers/src/builtins/processEnvironmentAccess.ts`
- `packages/guidance/src/effectQuality/advice.ts`

## Intent

Route runtime configuration through Effect Config instead of ambient environment access.

## Detection boundary

Reports symbol-resolved static or computed paths rooted at `process.env` in classified roles other than root or test. One outermost access produces one finding.

## Exemptions and non-findings

Root, test, unclassified files, shadowed `process`, and non-environment process properties are quiet in this compatibility rule. The standalone default policy covers unclassified production files.

## Guidance

Read the key through Config in a layer and provide deterministic test configuration.

## Dependencies

TypeScript checker, ambient process symbol provenance, Effect-quality role classification, and shared environment-access analysis.

## Tests and examples

- `tests/fixtures/effect-quality/src/application/rules.ts`
- `tests/effectQuality.test.ts`
- `tests/processEnvironment.test.ts`

## Skill migration

- Proposed skill: lint-rule-effect-quality-process-environment
- Scope: local file
- Required semantic context: resolved process symbols, access paths, and Effect-quality role
- Runner phase/fleet: detection / effect-quality-rules
- Deterministic candidate generation: reuse `effectQualityRuleMatcher` with runner-supplied source files

## Open questions

None identified.
