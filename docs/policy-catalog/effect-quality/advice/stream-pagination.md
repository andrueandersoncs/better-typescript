# stream-pagination

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceStreamPagination.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Model effectful token-based pagination with `Stream.paginate`.

## Detection boundary
In production roles, emits for while/do/for loops containing page-token vocabulary and an accumulation/yield operation, unless the enclosing function already uses imported `Stream.paginate`.

## Exemptions and non-findings
Tests/nonproduction roles, loops lacking token or accumulation signals, and functions with `Stream.paginate` are quiet.

## Guidance
Use `Stream.paginate` for effectful token-based page sources.

## Dependencies
Architecture role, subtree syntax/name scans, enclosing-function scan, Stream import identity.

## Tests and examples
Positive token loop: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No paginate negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-stream-pagination`; local scope; role and loop-intent context; Effect streams fleet, advice phase; deterministic candidates plus semantic review: partial.

## Open questions
The matcher does not require the loop’s page source to be effectful.
