# process-environment

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeEnv.ts`; `packages/matchers/src/builtins/functionalCoreEffect/capabilitySubjects.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Route runtime configuration through Effect Config instead of ambient environment access.

## Detection boundary
Reports symbol-resolved `process.env`, nested properties, and element accesses in classified roles other than root or test.

## Exemptions and non-findings
Root, test, unclassified files, shadowed `process`, and non-environment process properties are quiet.

## Guidance
Read the key through Config in a layer and provide deterministic test config.

## Dependencies
Architecture-role classifier, TypeScript symbol resolution, ambient-capability helper.

## Tests and examples
Positive application fixture: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No root/shadowing negatives identified here.

## Skill migration
Propose `lint-rule-effect-quality-process-environment`; local scope; symbol and role context; Effect config/retry fleet, semantic phase; deterministic candidates: strong.

## Open questions
Unclassified files are silently skipped; the skill must preserve configurable role classification.
