# http-client-preference

## Classification
Derived file-level Effect-quality advice with path exceptions.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceRawFetch.ts`; `packages/matchers/src/builtins/effectQuality/evidenceHttpBoundaryShared.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Prefer Effect’s typed HTTP client inside adapters.

## Detection boundary
In adapter files, emits for symbol-confirmed ambient `fetch` when the path is not excepted and the source file contains no recognized Effect HttpClient/FetchHttpClient member usage.

## Exemptions and non-findings
Non-adapters, configured paths, nonambient fetch, and any file-level recognized HttpClient usage are quiet.

## Guidance
Use Effect HttpClient unless a documented raw-fetch exception applies.

## Dependencies
Architecture role, TypeScript symbol/import identity, whole-file HttpClient scan, path exception policy.

## Tests and examples
Positive adapter fetch: `tests/fixtures/effect-quality/src/adapters/http.ts`; coverage: `tests/effectQuality.test.ts`. No mixed-client suppression fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-http-client-preference`; local scope; checker/import/role/path context; Effect HTTP fleet, advice phase; deterministic candidates: strong.

## Open questions
Unrelated HttpClient usage anywhere in a file suppresses all raw-fetch advice there.
