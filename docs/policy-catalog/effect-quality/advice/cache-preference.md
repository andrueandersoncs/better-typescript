# cache-preference

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceCache.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Suggest Effect Cache for cache-like Maps before a full TTL anti-pattern is established.

## Detection boundary
In production roles, emits for `new Map` bound to a name containing `cache`, or `.set(key, object)` where the object has a TTL-like field and the file contains no `Cache.make`/`makeWith`.

## Exemptions and non-findings
Tests/nonproduction roles, non-cache Map names, values without recognized TTL fields, and files already constructing Effect Cache are quiet. Complete TTL patterns are owned by the reported rule.

## Guidance
Use `Cache.make` or `Cache.makeWith` when lifecycle semantics fit.

## Dependencies
Architecture role, binding/property names, Effect Cache import identity, whole-file scan.

## Tests and examples
The broad fixture in `tests/fixtures/effect-quality/src/application/rules.ts` supplies Map/cache shapes; kind coverage: `tests/effectQuality.test.ts`. No isolated trigger is asserted.

## Skill migration
Propose `lint-rule-effect-quality-cache-preference`; local scope; role/name/import context; Effect cache fleet, advice phase; deterministic candidates plus intent review: partial.

## Open questions
The positive fixture may be satisfied by more than one candidate, so exact trigger coverage is unclear.
