# pass-through-conversion

## Classification

Reported `concept-control` rule kind; project-wide conversion-shape analysis.

## Active wiring

Emitted by the reported `concept-control` policy in `conceptAndCompositionPolicies` and
`defaultWiring`. Its detections can contribute to `concept proliferation` advice.

## Implementation sources

- `packages/guidance/src/policies/conceptControl.ts`
- `packages/guidance/src/policies/conceptControlMessages.ts`
- `packages/guidance/src/policies/conceptControlHints.ts`
- `packages/matchers/src/builtins/conceptControl/conceptControl.ts`
- `packages/matchers/src/builtins/conceptControl/conceptIndex.ts`
- `packages/matchers/src/builtins/conceptControl/data.ts`

## Intent

Detect parallel first-party representations connected only by field-for-field copying without a
real transformation boundary.

## Detection boundary

Reports an indexed conversion whose function copies a source model into a target model without
transformation. Both models must remain unoccupied by redundant, closed, or duplicate structural
findings; the detection is located at the conversion node.

## Exemptions and non-findings

Conversions that transform semantics, established boundary projections, non-model inputs/outputs,
and conversions involving structurally occupied models are not findings.

## Guidance

Collapse the parallel representations, or document and preserve the real boundary that requires
both. A field-for-field adapter is evidence against another first-party concept.

## Dependencies

The shared `ConceptIndex`, conversion recognition, property correspondence, model/function symbol
identity, callers, and structural-precedence state.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/conversion/`;
`tests/fixtures/concept-control/src/allowed/projectReport.ts`.

## Skill migration

Proposed `lint-rule-concept-control-pass-through-conversion`; workspace scope; preserve deterministic
conversion candidates and both related model names for skill review and aggregate advice.

## Open questions

None identified.
