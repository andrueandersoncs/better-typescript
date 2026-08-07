# typed-boundary-error

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceTypedBoundary.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Translate infrastructure failures into operation-labelled typed domain errors at adapter/application seams.

## Detection boundary
In adapter/application files, emits for Effect `catchAll`, `catchAllDefect`, `catchCause`, or `catchAllCause` whose handler throws or constructs raw `Error`; handlers with tagged/domain-looking construction or `Effect.fail*` and no raw error are quiet.

## Exemptions and non-findings
Other roles/APIs, missing handlers, handlers without raw error/throw, and recognized typed mappings are quiet.

## Guidance
Map failures at the seam to a typed domain error with operation context.

## Dependencies
Architecture role, Effect import identity, handler subtree scans, error-constructor naming heuristics.

## Tests and examples
Positive raw boundary recovery: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No accepted typed mapping fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-typed-boundary-error`; local scope; role/import/handler semantic context; Effect errors fleet, advice phase; deterministic candidates plus mapping judgment: partial.

## Open questions
Any handler that neither throws nor constructs raw Error is treated as acceptable, even if it erases error detail.
