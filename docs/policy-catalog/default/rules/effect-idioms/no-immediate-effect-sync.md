# no-immediate-effect-sync

## Classification

Reported default policy; Effect suspension ownership; symbol-aware local-flow detection.

## Active wiring

Listed in `effectFunctionPolicies`, then `defaultWiring`; self-hosted on all product source files.

## Implementation sources

- `packages/matchers/src/builtins/noImmediateEffectSync.ts`
- `packages/matchers/src/builtins/referencesToSymbol.ts`
- `packages/guidance/src/preset/defaultWiring.ts`

## Intent

Remove redundant Effect construction when a synchronous action is immediately executed.

## Detection boundary

Reports a local `Effect.sync` binding whose sole consumption is an immediate `Effect.runSync`, including transparent initializer wrappers, multi-declarator statements, and return, assignment, or initializer consumers.

## Exemptions and non-findings

Deferred, composed, captured, or independently reused Effects are quiet.

## Guidance

Run the synchronous action directly at the runtime boundary, or retain and compose the Effect.

## Dependencies

TypeScript checker, Effect symbol provenance, transparent-expression normalization, and local symbol-reference analysis.

## Tests and examples

- `tests/noImmediateEffectSync.test.ts`
- `tests/fixtures/no-immediate-effect-sync/`
- `packages/guidance/examples/no-immediate-effect-sync/`

## Skill migration

- Proposed skill: lint-rule-no-immediate-effect-sync
- Scope: local file
- Required semantic context: resolved Effect symbols and local binding references
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse `noImmediateEffectSyncMatcher` with runner-supplied source files

## Open questions

None identified.
