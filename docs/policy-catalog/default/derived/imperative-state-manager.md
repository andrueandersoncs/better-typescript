# imperative-state-manager

## Classification
Derived file-level default advice outcome.

## Active wiring
`defaultSpecificAdvice` selects five named signals and invokes `imperativeStateManager`; `defaultDerive` emits the result before fallback aggregate advice.

## Implementation sources
`packages/guidance/src/imperativeStateManager/imperativeStateManager.ts`; `packages/guidance/src/imperativeStateManager/data.ts`; `packages/guidance/src/preset/defaultSpecificAdvice.ts`; `packages/core/src/engine/location/location.ts`.

## Intent
Escalate dense mutation of shared state from local edits to a file-level runtime/lifecycle redesign.

## Detection boundary
Groups `no-mutation` detections by file and decodes their data. Emits when a file has at least eight detections with `target: "shared-state"`; evidence always includes that shared count and includes nonzero total `no-mutation`, `prefer-hash-map`, `prefer-hash-set`, `no-mutable-array-methods`, and `no-mutable-variable-declarations` counts for the same path.

## Exemptions and non-findings
Local/builtin mutation does not count toward the threshold; fewer than eight shared-state writes is clean; malformed/missing mutation data is ignored. Other evidence policies do not trigger advice without qualifying mutation.

## Guidance
Move long-lived cells into `Ref`/`SynchronizedRef`, subscriber flow into `PubSub`, assemble behind Layer, and enter Effect once at the boundary.

## Dependencies
Complete normalized findings from `no-mutation`, `prefer-hash-map`, `prefer-hash-set`, `no-mutable-array-methods`, and `no-mutable-variable-declarations`, including preserved mutation fact data.

## Tests and examples
Threshold/unit coverage in `tests/advice.test.ts`; end-to-end pair in `packages/guidance/examples/imperative-state-manager/`; runner coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Proposed `lint-advice-imperative-state-manager`; file aggregate scope; requires normalized rule IDs, locations, and `no-mutation.target`; derived-state fleet, post-rule aggregation phase; deterministic candidate generation can reproduce threshold/grouping exactly and hand only qualifying files to the skill.

## Open questions
None identified.
