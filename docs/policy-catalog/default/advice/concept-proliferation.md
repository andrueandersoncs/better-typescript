# concept-proliferation

## Classification
Derived directory-level default advice outcome from the reported `concept-control` policy.

## Active wiring
`defaultSpecificAdvice` selects `concept-control` detections and invokes `conceptProliferation`; the same derivation also emits separate `closed abstraction cluster` advice, outside this outcome.

## Implementation sources
`packages/guidance/src/conceptControl/conceptProliferation.ts`; `packages/guidance/src/preset/defaultSpecificAdvice.ts`; `packages/guidance/src/policies/conceptControl.ts`; `packages/matchers/src/builtins/conceptControl/conceptControl.ts`; `packages/matchers/src/builtins/conceptControl/conceptIndex.ts`; `packages/matchers/src/builtins/conceptControl/data.ts`.

## Intent
Treat multiple weakly justified representations in one concept directory as a vocabulary/design problem.

## Detection boundary
Decodes `ConceptSignalData`, keeps `duplicate-shape`, `function-derived-model`, `parameter-bag`, `pass-through-conversion`, `redundant-alias`, `speculative-export`, and `unused-field`, then groups by immediate directory. Emits when a directory has at least two qualifying signals and at least two distinct concepts across each signal's concept plus related concepts.

## Exemptions and non-findings
Malformed data, `closed-abstraction` and `missing-rationale` kinds, one signal, or signals covering only one distinct concept do not trigger proliferation. File separation inside the same immediate directory does not exempt findings.

## Guidance
Review the directory as one vocabulary: delete speculative fields/exports, merge/reuse equivalent shapes, collapse pass-through conversions, and deepen the remaining module behind fewer models.

## Dependencies
Workspace `concept-control` index and complete findings with kind, concept, related concepts, owners, and callers; immediate-directory normalization.

## Tests and examples
End-to-end pair in `packages/guidance/examples/concept-proliferation/`; runner assertion in `tests/aggregateAdviceExamples.test.ts`. No direct threshold unit test was identified.

## Skill migration
Proposed `lint-rule-concept-proliferation`; directory aggregate scope with workspace semantic input; requires normalized `ConceptSignalData` and concept relations; concept-control fleet, post-concept-rule aggregation phase; deterministic candidate generation can filter/group/count exactly before skill interpretation.

## Open questions
Direct unit coverage for the directory threshold/eligible-kind filter was not identified.
