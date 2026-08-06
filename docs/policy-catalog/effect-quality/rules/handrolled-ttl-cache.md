# handrolled-ttl-cache

## Classification
Reported Effect-quality rule using file-level lexical evidence.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeHandrolledCache.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Replace complete hand-rolled TTL Map caches with Effect Cache when semantics fit.

## Detection boundary
Reports every `new Map` in a file whose source text contains an expiry-like word, `Date.now`, and `.delete(` anywhere.

## Exemptions and non-findings
Files lacking any of the three lexical signals and non-Map constructors are quiet. Signals need not belong to the same cache.

## Guidance
Use `Cache.make` or `Cache.makeWith` when lifecycle and eviction semantics fit.

## Dependencies
TypeScript syntax plus whole-file text search.

## Tests and examples
Two Map instances in `tests/fixtures/effect-quality/src/application/rules.ts` exercise the file-level pattern; kind presence only: `tests/effectQuality.test.ts`.

## Skill migration
Propose `lint-rule-effect-quality-handrolled-ttl-cache`; local scope; syntax plus lexical context; Effect cache fleet, candidate phase; deterministic candidates: complete but coarse.

## Open questions
The implementation can report unrelated Maps when TTL signals occur elsewhere in the file.
