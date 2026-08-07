# transaction-network-work

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceHttpHandlers.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Keep provider/network latency outside authoritative transactions.

## Detection boundary
In production roles, emits for network-looking calls inside a function or ancestor call whose name matches transaction vocabulary.

## Exemptions and non-findings
Tests/nonproduction roles, calls outside name-matched transactions, and unrecognized network APIs are quiet.

## Guidance
Finish provider/network work before entering the authoritative transaction.

## Dependencies
Architecture role, enclosing/ancestor call names, imported HTTP and generic method heuristics.

## Tests and examples
Positive named `transaction` function: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No explicit safe ordering fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-transaction-network-work`; local scope; role/call/ancestor semantic context; Effect HTTP fleet, advice phase; deterministic candidates plus agent validation: partial.

## Open questions
Name matching does not establish that the surrounding operation is an actual database transaction.
