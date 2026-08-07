# public-queue

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidencePublicQueue.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Keep Queue, PubSub, SubscriptionRef, Dequeue, and Enqueue implementation-private and expose Stream values.

## Detection boundary
In production non-port roles, emits when exported calls/variables construct Queue-family APIs, exported variable annotations reference queue-family names, or exported interfaces/type aliases contain those names.

## Exemptions and non-findings
Ports (owned by infrastructure-contract), tests/nonproduction roles, nonexported surfaces, and aliases not syntactically containing recognized family identifiers are quiet.

## Guidance
Publish Stream values rather than queue handles.

## Dependencies
Architecture role, export syntax, Effect constructor import identity, type-syntax subtree scan.

## Tests and examples
Positive exported Queue: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No private queue negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-public-queue`; local scope; export/import/type context; Effect streams fleet, semantic phase; deterministic candidates: strong.

## Open questions
Type aliases can hide queue-family types from the syntactic scan.
