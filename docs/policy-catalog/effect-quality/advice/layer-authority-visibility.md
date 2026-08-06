# layer-authority-visibility

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceLayers.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Keep credentials, persistence, transports, and other authority visible in service requirements.

## Detection boundary
In classified non-test files, emits for `Context.Reference` with a literal key matching authority/credential/database/transport vocabulary.

## Exemptions and non-findings
Tests, dynamic/nonmatching keys, and non-Reference APIs are quiet.

## Guidance
Do not hide authority behind a default `Context.Reference`.

## Dependencies
Architecture role, Effect import identity, key-name regex.

## Tests and examples
Positive `API_TOKEN` reference: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No benign Reference fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-layer-authority-visibility`; local scope; import/role/name context; Effect layers fleet, advice phase; deterministic candidates: complete.

## Open questions
The key vocabulary may both miss indirect authority and include benign values.
