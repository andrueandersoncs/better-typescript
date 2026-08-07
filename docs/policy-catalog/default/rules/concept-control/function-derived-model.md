# function-derived-model

## Classification

Reported `concept-control` rule kind; project-wide naming and ownership analysis.

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

Reject data models named only for one function's input, output, options, context, state, or result
rather than for independent domain semantics.

## Detection boundary

After structural checks, derives a function-role stem from the model name, finds a matching owning
function, and reports when every model owner remains inside that function and its callers. Boundary
and protocol roles suppress the check.

## Exemptions and non-findings

Models with boundary or protocol roles, models with owners outside the function cluster, names that
do not resolve to an owning function role, and structurally occupied models are not findings.

## Guidance

Remove or deepen the function/data abstraction, reuse an existing domain concept, or choose a name
whose meaning exceeds its structural role for one function.

## Dependencies

The shared `ConceptIndex`, function-derived name stems, model/function ownership, caller graphs,
roles, and structural-precedence state.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/derived/`;
`tests/fixtures/concept-control/src/allowed/`; `packages/guidance/examples/concept-control/`.

## Skill migration

Proposed `lint-rule-concept-control-function-derived-model`; workspace scope; generate candidates
from the shared ownership/name index before skill validation and directory advice aggregation.

## Open questions

None identified.
