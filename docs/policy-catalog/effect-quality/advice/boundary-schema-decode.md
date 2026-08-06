# boundary-schema-decode

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceBoundaryDecode.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Decode unknown JSON at external boundaries before consuming it.

## Detection boundary
In production roles, emits for global-looking `JSON.parse` or request/body/payload/event `.json()` calls, excluding HTTP response JSON, when no recognized Schema decode directly wraps the call or appears elsewhere in the enclosing function.

## Exemptions and non-findings
Tests/nonproduction roles, response JSON, directly/nearby decoded calls, aliased JSON APIs, and receiver names outside the request pattern are quiet.

## Guidance
Use `Schema.decodeUnknownEffect` or a boundary-specific decoder.

## Dependencies
Architecture role, syntactic JSON recognition, Effect Schema import identity, enclosing-function scan.

## Tests and examples
Positive `JSON.parse`: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No nearby-decode negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-boundary-schema-decode`; local scope; role/import/function context; Effect schema/safety fleet, advice phase; deterministic candidates: strong.

## Open questions
Nearby Schema decoding is not data-flow-associated with the parsed value.
