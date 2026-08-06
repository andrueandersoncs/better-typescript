# adapter-business-logic

## Classification
Derived file-level functional-core shape advice.

## Active wiring
Silent `functional-core-effect-shape-evidence` plus `functionalCoreEffectDerive`; active where role policy identifies adapter files.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/shapeEvidence.ts`; `packages/guidance/src/functionalCoreEffect/advice.ts`.

## Intent
Move policy decisions out of infrastructure adapters into pure domain functions.

## Detection boundary
Counts all if/switch/conditional nodes and runtime function-like declarations in an adapter file; emits at three or more branches and two or more functions.

## Exemptions and non-findings
Other roles, adapters below either threshold, and syntax not counted as a branch/function are quiet.

## Guidance
Keep translation/foreign effects in the adapter; move business decisions into the domain.

## Dependencies
Architecture role and whole-file AST shape metrics.

## Tests and examples
Positive: `tests/fixtures/functional-core-effect/src/adapters/businessPolicy.ts`; thresholds asserted in `tests/functionalCoreEffect.test.ts`. Dedicated pair: `packages/guidance/examples/adapter-business-logic/1` and aggregate example test.

## Skill migration
Propose `lint-rule-functional-core-adapter-business-logic`; local scope; role plus shape metrics and semantic intent; functional-core shape fleet, advice phase; deterministic candidates plus agent validation: partial.

## Open questions
The metric cannot distinguish policy branching from adapter translation/validation branching.
