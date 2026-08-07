# duplicate-shape

## Classification

Reported `concept-control` rule kind; project-wide structural model comparison.

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

Prevent multiple first-party names from representing the same concrete data structure without an
independent boundary or invariant.

## Detection boundary

Normalizes comparable model shapes, sorts each same-shape group by source path and name, and reports
every noncanonical member against the first member. Redundant aliases and closed abstractions take
precedence, so their models do not also report as duplicates.

## Exemptions and non-findings

Unique or noncomparable shapes are clean. The canonical first model is not reported. Models already
classified as redundant or closed are excluded; independently evolving semantics are not inferred
from a different name alone.

## Guidance

Reuse or merge with the canonical model. Keep a distinct representation only for a real,
independently evolving boundary or invariant.

## Dependencies

The shared `ConceptIndex`, normalized structural shapes, deterministic group ordering, symbol
identity, and structural-precedence state.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/duplicate/`;
`tests/fixtures/concept-control/src/v4/`; `packages/guidance/examples/concept-proliferation/`.

## Skill migration

Proposed `lint-rule-concept-control-duplicate-shape`; workspace scope; deterministically build shape
groups once, preserve the canonical-target relation, and route duplicate candidates to this skill.

## Open questions

None identified.
