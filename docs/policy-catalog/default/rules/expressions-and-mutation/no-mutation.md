# no-mutation

## Classification
Reported default expressions/mutation policy; emits `local`, `shared-state`, or `builtin` target data.

## Active wiring
`expressionAndMutationPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`; `shared-state` findings feed `imperative-state-manager`.

## Implementation sources
`packages/guidance/src/policies/noMutation.ts`; `packages/matchers/src/builtins/noMutation.ts`; `packages/matchers/src/support/tsNode.ts`; `packages/matchers/src/support/tsType.ts`.

## Intent
Prevent mutation of owned data and move durable state into the Effect runtime.

## Detection boundary
Examines assignment operators, `++/--`, and `delete`; finds the true write target/root receiver. Reports project-owned bindings/data and ECMAScript built-ins. Classifies module-scope, captured, and `this` writes as shared state; same-execution-boundary bindings as local; ES-lib targets as builtin.

## Exemptions and non-findings
Allows non-assignment operators and mutation of uncontrolled third-party/host structures whose declarations are outside the project and ES libs, including imported TypeScript structures, DOM handler slots, and nullish unions thereof. Unknown symbols fall back to local ownership; intersection/union origin checks are conservative.

## Guidance
Derive new local values with immutable Array/Struct operations; put long-lived/captured state in `Ref`/`SynchronizedRef`/`PubSub` behind a Layer; never mutate built-ins.

## Dependencies
Whole-program symbol/declaration origin, alias resolution, type traversal, execution-boundary analysis, and assignment-target helpers.

## Tests and examples
`tests/noMutation.test.ts`; `tests/fixtures/no-mutation/`; `packages/guidance/examples/no-mutation/` (three pairs cover local immutable updates and Ref state).

## Skill migration
Proposed `lint-rule-no-mutation`; local write finding with project semantic scope; requires resolved symbols/types, declaration provenance, aliasing, capture boundaries, and target classification; expressions/mutation fleet, semantic candidate phase; deterministic candidate generation can enumerate mutation syntax and run the existing ownership classifier.

## Open questions
None identified.
