# effect-quality-advice-evidence

## Classification
Silent multiplexed evidence policy for 19 independently actionable Effect-quality advice kinds.

## Active wiring
Included with reported rules by `makeEffectQualityWiring`; `effectQualityDerive` converts each valid `EffectQualityAdviceData` detection into file-level advice. Self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/effectQualityEvidence.ts`; `packages/matchers/src/builtins/effectQuality/evidence.ts`; `packages/matchers/src/builtins/effectQuality/data.ts`; `packages/guidance/src/policies/effectQualityAdviceEvidence.ts`; `packages/guidance/src/effectQuality/advice.ts`; `packages/guidance/src/preset/effectQualityWiring.ts`.

## Intent
Collect local heuristic evidence while keeping user-facing titles, remediations, and examples in derivation.

## Detection boundary
Subscribes to every TypeScript syntax kind, classifies the file role once through the shared index, and dispatches nodes to the 19 evidence collectors. Detections carry only `kind` and `subject`; location comes from the matched AST node.

## Exemptions and non-findings
Unclassified files produce no evidence. Each kind applies its own role and suppression rules. Invalid payloads are ignored by derivation.

## Guidance
The silent policy has no direct user guidance; `effectQualityDerive` supplies the per-kind title/remediation and shared `effect-quality` example pair.

## Dependencies
Project-wide TypeScript program/index, `EffectQualityPolicy` role/path/idempotency/key predicates, all evidence collector modules, engine signal/derive schemas.

## Tests and examples
`tests/effectQuality.test.ts` asserts all 19 kinds occur and advice count is at least 19 using `tests/fixtures/effect-quality`. `packages/guidance/examples/effect-quality/1` is generic and only demonstrates an unsafe cast, not the advice kinds.

## Skill migration
Propose `lint-evidence-effect-quality-advice` as runner infrastructure, not a user-facing rule skill; workspace scope feeding file-local kinds; checker, role, path-policy, and whole-file semantic context; candidate-generation phase before advice fleets; deterministic candidate generation: strong per current heuristics.

## Open questions
The every-syntax-kind subscription is broad; migration should generate typed candidate indexes once and route them to individual skills. Per-kind negative/parity tests and relevant examples are largely absent.
