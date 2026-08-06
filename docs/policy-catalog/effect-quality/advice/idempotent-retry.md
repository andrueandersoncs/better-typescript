# idempotent-retry

## Classification
Derived file-level Effect-quality advice with configurable operation classification.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceConfigRetry.ts`; `packages/matchers/src/builtins/effectQuality/policy.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Require domain-established idempotency before retrying mutations.

## Detection boundary
In production roles, emits for `Effect.retry`/`retryOrElse` inside a named function whose name begins with a mutation verb and is not accepted by `policy.idempotentOperation`.

## Exemptions and non-findings
Tests/nonproduction roles, unnamed operations, nonmutation names, and default read-like operation names are quiet.

## Guidance
Retry only operations whose idempotency is part of the domain contract.

## Dependencies
Architecture role, enclosing-function name, Effect import identity, configurable idempotency predicate.

## Tests and examples
Positive `saveUser`: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No custom-policy or read-operation negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-idempotent-retry`; local scope; role/import/function-name plus domain-policy context; Effect config/retry fleet, advice phase; deterministic candidates: strong.

## Open questions
Name-based idempotency cannot establish the actual domain contract; skill output should remain advice.
