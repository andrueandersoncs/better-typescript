# unsafe-casts

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaSafety.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Prevent unchecked `any` from bypassing Effect and Schema invariants.

## Detection boundary
Reports `as any` and angle-bracket `<any>` assertions at the asserted type node.

## Exemptions and non-findings
Other assertions, `unknown`, and implicit `any` are not detected. No role filter applies.

## Guidance
Use Schema decoding, a branded type, or a verified narrowing predicate.

## Dependencies
TypeScript syntax only; shared Effect-quality dispatcher and finding payload.

## Tests and examples
Positive fixture: `tests/fixtures/effect-quality/src/application/rules.ts`; inventory assertion: `tests/effectQuality.test.ts`. The package example only demonstrates this kind.

## Skill migration
Propose `lint-rule-effect-quality-unsafe-casts`; local scope; syntax context; Effect schema/safety fleet, candidate phase; deterministic AST candidate generation: complete.

## Open questions
No dedicated negative or assertion-variant tests identified.
