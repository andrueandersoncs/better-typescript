# closed-abstraction

## Classification

Reported `concept-control` rule kind; project-wide relational model/function analysis.

## Active wiring

Emitted by the reported `concept-control` policy in `conceptAndCompositionPolicies` and
`defaultWiring`. Its detections also derive `closed abstraction cluster` advice.

## Implementation sources

- `packages/guidance/src/policies/conceptControl.ts`
- `packages/guidance/src/policies/conceptControlMessages.ts`
- `packages/guidance/src/policies/conceptControlHints.ts`
- `packages/matchers/src/builtins/conceptControl/conceptControl.ts`
- `packages/matchers/src/builtins/conceptControl/conceptIndex.ts`
- `packages/matchers/src/builtins/conceptControl/data.ts`

## Intent

Detect a model and function that justify only one another instead of providing an independently
useful abstraction.

## Detection boundary

Reports a model with no inferred architectural role when one owning function has at most one
external caller and every model owner stays inside that function/caller cluster. Redundant aliases
take precedence, and the finding occupies the model before duplicate or later concept checks.

## Exemptions and non-findings

Models with any shared, boundary, invariant, protocol, or recursive role are excluded. Models with
owners outside the closed cluster, functions with more than one external caller, and models already
classified as redundant aliases are not findings.

## Guidance

Collapse the private model/function vocabulary into its external owner, reuse an existing concept,
or deepen the Module until it owns an independent seam, invariant, protocol, or multiple consumers.
Do not replace the named model with an anonymous object type.

## Dependencies

The shared `ConceptIndex`, model roles, model owners, function owners, caller relationships, and
structural-precedence state.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/closed/`;
`packages/guidance/examples/concept-control/`; `tests/aggregateAdviceExamples.test.ts`.

## Skill migration

Proposed `lint-rule-concept-control-closed-abstraction`; workspace scope; reuse one deterministic
concept index and route only `closed-abstraction` candidates to this skill before downstream advice.

## Open questions

None identified.
