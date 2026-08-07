# raw-fetch-outside-adapter

## Classification
Derived file-level Effect-quality advice with path exceptions.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceRawFetch.ts`; `packages/matchers/src/builtins/effectQuality/evidenceHttpBoundaryShared.ts`; `packages/matchers/src/builtins/effectQuality/policy.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Keep raw fetch behind adapter/root boundaries.

## Detection boundary
In production domain, port, or application files, emits for symbol-confirmed ambient `fetch` calls unless the project-relative path matches `policy.rawFetchException`.

## Exemptions and non-findings
Adapters, roots, tests, unclassified/nonproduction roles, nonambient fetch methods, and configured exceptions are quiet.

## Guidance
Move fetch behind a named adapter or use Effect HttpClient.

## Dependencies
Architecture role, TypeScript global-fetch identity, project root/path conversion, configurable exception predicate.

## Tests and examples
Positive application fetch: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No exception/root/adapter negative assertion identified.

## Skill migration
Propose `lint-rule-effect-quality-raw-fetch-outside-adapter`; local scope; checker, role, and path-policy context; Effect HTTP fleet, advice phase; deterministic candidates: strong.

## Open questions
The skill needs a portable form for custom path exceptions.
