# typed-error-recovery

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeTypedError.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Use typed failure recovery instead of broad Cause recovery when an error channel exists.

## Detection boundary
Reports Effect/Stream `catchCause` in direct, method-pipe, function-pipe, and data-last stage forms when the recovered receiver’s inferred error channel is non-`never`.

## Exemptions and non-findings
Defect-only/`never` channels, unresolved receiver types, other catch APIs, and shadowed names are quiet.

## Guidance
Use `catchIf`, `catchTag`, `catchFilter`, or retry for expected typed failures.

## Dependencies
TypeScript checker/type arguments, Effect/Stream import identity, pipe-shape reconstruction.

## Tests and examples
Positive broad recovery: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`. No pipe-form or `never` negative fixtures identified.

## Skill migration
Propose `lint-rule-effect-quality-typed-error-recovery`; local scope; checker and pipeline context; Effect errors fleet, semantic phase; deterministic candidates: strong.

## Open questions
Rendered-type fallback may be sensitive to TypeScript/Effect type rendering changes.
