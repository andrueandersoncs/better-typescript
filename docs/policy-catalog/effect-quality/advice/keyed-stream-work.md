# keyed-stream-work

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceWorkers.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Centralize per-key fiber serialization with FiberMap.

## Detection boundary
In production roles, emits for `new Map` bound to fiber/worker/inflight/running/keyed names, or map-like `.set` calls whose value is a recognized Effect fork or text mentions Fiber. Recognized FiberMap API calls are quiet at that node.

## Exemptions and non-findings
Tests/nonproduction roles, neutral names, nonfiber values, and recognized FiberMap calls are quiet.

## Guidance
Use a named FiberMap helper so per-key serialization is explicit.

## Dependencies
Architecture role, binding/receiver names, Effect/FiberMap import identity, value-text fallback.

## Tests and examples
The effect-quality fixture contains `inflight` Map state but no clearly isolated keyed-fiber example; kind coverage is asserted in `tests/effectQuality.test.ts`.

## Skill migration
Propose `lint-rule-effect-quality-keyed-stream-work`; local scope; role/name/import/intent context; Effect lifecycle fleet, advice phase; deterministic candidates plus agent validation: partial.

## Open questions
Exact positive fixture path is ambiguous because the test asserts only kind presence.
