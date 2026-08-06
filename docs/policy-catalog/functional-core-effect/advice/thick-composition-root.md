# thick-composition-root

## Classification
Derived file-level functional-core shape advice.

## Active wiring
Silent `functional-core-effect-shape-evidence` plus `functionalCoreEffectDerive`; self-host active for `packages/cli/src` under the custom root mapping.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/shapeEvidence.ts`; `packages/guidance/src/functionalCoreEffect/advice.ts`.

## Intent
Keep composition roots limited to Layer wiring, program selection, and one runtime handoff.

## Detection boundary
For root files, emits when non-composition code contains at least two branches or two functions. Nodes nested in recognized Layer/provision/run APIs and runtime functions that directly return recognized composition are excluded.

## Exemptions and non-findings
Other roles, thin roots, recognized composition subtrees, and direct composition-returning helpers are quiet.

## Guidance
Move reusable functions and policy branches inward.

## Dependencies
Architecture role, Effect/Layer/ManagedRuntime/platform runtime identity, whole-file AST metrics and composition-ancestor analysis.

## Tests and examples
Positive thick root and layered/factored non-findings: `tests/fixtures/functional-core-effect/src/entrypoints/thick.ts`, `tests/fixtures/functional-core-effect/src/entrypoints/layeredComposition.ts`, and `tests/fixtures/functional-core-effect/src/entrypoints/factoredComposition.ts`; asserted in `tests/functionalCoreEffect.test.ts`. Dedicated pair: `packages/guidance/examples/thick-composition-root/1`.

## Skill migration
Propose `lint-rule-functional-core-thick-composition-root`; local scope; checker/role/composition-shape context; functional-core shape fleet, advice phase; deterministic candidates plus architectural review: partial.

## Open questions
Only recognized composition APIs are excluded; local wrapper conventions may inflate metrics.
