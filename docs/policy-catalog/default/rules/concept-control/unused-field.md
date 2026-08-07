# unused-field

## Classification

Reported `concept-control` rule kind; project-wide semantic field-use analysis.

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

Detect speculative model fields that are constructed but never independently consumed by behavior.

## Detection boundary

After earlier concept checks, reports each field whose symbol is never directly read and whose name
is absent from functional reads. Boundary and protocol models skip field-use analysis. Each finding
is located at the field declaration when available.

## Exemptions and non-findings

Directly or functionally read fields, boundary/protocol models, inherited infrastructure fields
excluded by the index, and models already classified by higher-precedence checks are not findings.
Mechanical forwarding does not establish an independent semantic read.

## Guidance

Delete the speculative field or connect it to behavior that consumes its semantics. Forwarding it
into another representation instead indicates parallel concepts.

## Dependencies

The shared `ConceptIndex`, canonical field symbols, direct and functional field-read indexes, model
roles, declaration locations, and prior concept decisions.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/unused/`;
`tests/fixtures/concept-control/src/v4/`; `tests/fixtures/concept-control/src/allowed/`.

## Skill migration

Proposed `lint-rule-concept-control-unused-field`; workspace scope; compute field-read evidence once
and route each unused field independently to the skill before directory aggregation.

## Open questions

None identified.
