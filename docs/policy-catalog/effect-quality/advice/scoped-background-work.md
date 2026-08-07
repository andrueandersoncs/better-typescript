# scoped-background-work

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceWorkers.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Tie background worker lifetime to an explicit Effect scope.

## Detection boundary
In production roles outside Layer acquisition, emits for `Effect.forever`, unscoped fork APIs, or Stream runners under `Effect.forever` unless nested under `forkScoped`/`forkIn` or recognized FiberSet/FiberMap management.

## Exemptions and non-findings
Tests/nonproduction roles, Layer acquisition shapes, scoped ancestors, and unrecognized long-lived work are quiet; layer acquisition is owned by a reported rule.

## Guidance
Own worker lifetime in a Layer and fork into that scope.

## Dependencies
Architecture role, Effect/Stream/Fiber import identity, ancestor context.

## Tests and examples
Positive `Effect.forkDaemon`: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No FiberSet/FiberMap negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-scoped-background-work`; local scope; import/role/lifecycle context; Effect lifecycle fleet, advice phase; deterministic candidates: strong.

## Open questions
The recognized scope-manager API list may drift with Effect releases.
