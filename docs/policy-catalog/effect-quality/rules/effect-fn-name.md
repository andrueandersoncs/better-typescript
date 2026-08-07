# effect-fn-name

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedSchemaFnName.ts`; `packages/matchers/src/builtins/effectQuality/reportedSchemaEffectFnShared.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Require stable domain-qualified trace names for `Effect.fn` operations.

## Detection boundary
Reports recognized `Effect.fn` body and curried named forms when the literal name is absent or does not begin with two non-empty dot-separated segments.

## Exemptions and non-findings
Names matching `Domain.operation...` are accepted; dynamic names not recognized as literals are treated as unnamed only when the call has a recognized body form.

## Guidance
Use a stable name such as `UserRepo.get`.

## Dependencies
TypeScript checker and Effect import identity; transparent-callee and `Effect.fn` form inspection.

## Tests and examples
Anonymous and unqualified positives: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No accepted-name fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-effect-fn-name`; local scope; call/import semantics; Effect API-design fleet, semantic phase; deterministic candidates: strong.

## Open questions
No tests define policy for dynamically computed names or names with more than two segments.
