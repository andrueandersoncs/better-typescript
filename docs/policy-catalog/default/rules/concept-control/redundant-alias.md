# redundant-alias

## Classification

Reported `concept-control` rule kind; project-wide alias and model-identity analysis.

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

Prevent a second first-party type name from renaming an existing model without adding independent
semantics.

## Detection boundary

Reports an empty interface with one inherited type, or a type alias directly targeting a model. It
also recognizes `Omit`, `Partial`, `Pick`, `Readonly`, and `Required` aliases when the alias has at
most one owner. This check has precedence over closed and duplicate classification.

## Exemptions and non-findings

Interfaces with members or multiple heritage types, aliases without a recognized model target,
derived utility aliases with multiple owners, and models with a real invariant or boundary are not
findings.

## Guidance

Use the existing model directly, merge the concepts, or add a real invariant or independently
evolving boundary. Do not retain a second name only to describe structural use.

## Dependencies

The shared `ConceptIndex`, canonical symbol resolution, interface heritage, type references,
recognized derived utilities, and ownership counts.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/redundant/`;
`tests/fixtures/concept-control/src/allowed/`.

## Skill migration

Proposed `lint-rule-concept-control-redundant-alias`; workspace scope; run first among structural
concept checks and pass the exact aliased model as deterministic evidence.

## Open questions

None identified.
