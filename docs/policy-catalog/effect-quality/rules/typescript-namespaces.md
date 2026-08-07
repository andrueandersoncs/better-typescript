# typescript-namespaces

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaSafety.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Prefer ES module organization over TypeScript namespaces.

## Detection boundary
Reports every identifier-named `ModuleDeclaration` that is not a global augmentation.

## Exemptions and non-findings
String-literal ambient modules and global augmentations are not reported. No Effect usage or role is required.

## Guidance
Export named values or an ES module namespace projection.

## Dependencies
TypeScript syntax only.

## Tests and examples
Positive fixture: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No kind-specific refactor pair identified.

## Skill migration
Propose `lint-rule-effect-quality-typescript-namespaces`; local scope; syntax context; Effect schema/safety fleet, candidate phase; deterministic AST support: complete.

## Open questions
The rule is packaged as Effect quality but its detection is project-wide TypeScript style.
