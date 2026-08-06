# config-refined-values

## Classification
Derived file-level Effect-quality advice from silent evidence.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive` in `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceConfigRetry.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Refine path, URL, host, port, identifier, slug, and email configuration at ingestion.

## Detection boundary
In classified non-test files, emits for `Config.string` with a literal key matching the refined-key suffix regex when no ancestor uses recognized Config refinement APIs.

## Exemptions and non-findings
Tests, dynamic/nonmatching keys, and values under `Config.schema`, `mapOrFail`, `url`, `port`, `int`, or `boolean` are quiet. Sensitive-key redaction is owned separately.

## Guidance
Use `Config.schema` or `Config.mapOrFail` for constrained values.

## Dependencies
Architecture role, Effect import identity, ancestor scan, key-name heuristic.

## Tests and examples
Positive `APP_PORT`: `tests/fixtures/effect-quality/src/application/rules.ts`; kind and derivation coverage: `tests/effectQuality.test.ts`. Shared advice example is not kind-specific.

## Skill migration
Propose `lint-rule-effect-quality-config-refined-values`; local scope; import/role/ancestor context; Effect config/retry fleet, advice phase; deterministic candidates: strong.

## Open questions
No dedicated refined-value negative tests identified.
