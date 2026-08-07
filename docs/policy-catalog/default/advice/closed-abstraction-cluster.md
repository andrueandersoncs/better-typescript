# closed-abstraction-cluster

## Classification

Derived file-level default advice outcome from each reported `closed-abstraction` detection.

## Active wiring

`defaultSpecificAdvice` selects `concept-control` detections and invokes `conceptProliferation`.
Every valid `closed-abstraction` entry becomes this advice independently of directory proliferation.

## Implementation sources

- `packages/guidance/src/conceptControl/conceptProliferation.ts`
- `packages/guidance/src/preset/defaultSpecificAdvice.ts`
- `packages/guidance/src/policies/conceptControl.ts`
- `packages/matchers/src/builtins/conceptControl/conceptControl.ts`
- `packages/matchers/src/builtins/conceptControl/data.ts`

## Intent

Escalate a mutually dependent model/function cluster into one file-level abstraction redesign.

## Detection boundary

Decodes `ConceptSignalData`, selects `kind: "closed-abstraction"`, and emits one advice item at the
original detection location. Evidence records the detection's external caller count and independent
model-owner count; there is no additional threshold.

## Exemptions and non-findings

Malformed data and every other concept-control kind are ignored. A closed-abstraction detection is
not suppressed by concept-proliferation thresholds or fallback file-advice filtering.

## Guidance

Delete or merge the function/model cluster, reuse existing domain concepts, or deepen the Module
until it owns an independent seam, invariant, protocol, or multiple consumers. Do not replace the
model with an anonymous object type.

## Dependencies

Complete `concept-control` detections with `ConceptSignalData`, original locations, model owner, owner
count, caller count, and the default-specific-advice phase.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/closed/`;
`packages/guidance/examples/concept-control/`; `tests/aggregateAdviceExamples.test.ts`.

## Skill migration

Proposed `lint-rule-closed-abstraction-cluster`; file scope; consume validated
`closed-abstraction` candidates after rule execution and preserve the deterministic evidence counts.

## Open questions

None identified.
