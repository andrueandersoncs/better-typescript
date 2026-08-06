# inflight-dedupe-map

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedRuntimeHandrolledCache.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Use Effect Cache for same-key in-flight lookup sharing.

## Detection boundary
Reports `new Map` expressions or declarations when checker types/annotations reveal a Map value containing `Promise` or `Effect`, including nested type arguments/unions and rendered-type fallback.

## Exemptions and non-findings
Maps whose value type is not recognized as pending work and weakly typed Maps are quiet. No name, role, or actual deduplication behavior is required.

## Guidance
Use `Cache.get` to share the in-flight lookup for a missing key.

## Dependencies
TypeScript checker, recursive type inspection, Map syntax recognition.

## Tests and examples
Positive `Map<string, Promise<string>>`: `tests/fixtures/effect-quality/src/application/rules.ts`; kind coverage: `tests/effectQuality.test.ts`.

## Skill migration
Propose `lint-rule-effect-quality-inflight-dedupe-map`; local scope; checker type context; Effect cache fleet, semantic phase; deterministic candidates: strong.

## Open questions
The detector infers intent solely from the Map value type, so pending-work registries may be included.
