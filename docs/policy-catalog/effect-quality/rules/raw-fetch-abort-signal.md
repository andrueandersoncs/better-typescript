# raw-fetch-abort-signal

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedHttpFetch.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Propagate Effect cancellation into raw fetch performed by `Effect.tryPromise`.

## Detection boundary
Reports a recognized `Effect.tryPromise` function or `{ try }` callback containing ambient `fetch` when the first callback parameter is absent or no fetch init references that parameter through recognized object/spread/expression shapes.

## Exemptions and non-findings
Callbacks without fetch, fetch calls that pass the signal, non-global receiver methods, and fetch outside `tryPromise` are quiet.

## Guidance
Accept the `tryPromise` signal and pass it as `fetch` init `signal`.

## Dependencies
Effect import identity, callback/subtree scan, global-fetch syntactic recognition, parameter-reference analysis.

## Tests and examples
Positive: `tests/fixtures/effect-quality/src/adapters/http.ts`; kind coverage: `tests/effectQuality.test.ts`. No passing-signal fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-raw-fetch-abort-signal`; local scope; import and data-flow-lite context; Effect HTTP fleet, semantic phase; deterministic candidates: strong.

## Open questions
Signal flow through local aliases or helper functions is not modeled.
