# parameter-bag

## Classification

Reported `concept-control` rule kind; project-wide construction and call-seam analysis.

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

Detect a model introduced only to bundle values across one function call rather than to express an
independent command or domain concept.

## Detection boundary

Uses indexed object construction and call relationships to report a model constructed only as the
argument to one function seam. Models occupied by structural findings are skipped before role
filtering.

## Exemptions and non-findings

Boundary, invariant, and protocol roles are exempt. Reused models, models with independent
semantics, non-bag construction, and models already classified as redundant, closed, or duplicate
are not findings.

## Guidance

Remove or deepen the function seam, reuse existing domain values, or make the model a genuine
command with independent semantics. Do not explode it into primitive parameters or an anonymous
object type.

## Dependencies

The shared `ConceptIndex`, construction/call-seam indexing, model and function identity, roles,
callers, and structural-precedence state.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/parameter/`;
`tests/fixtures/concept-control/src/allowed/`.

## Skill migration

Proposed `lint-rule-concept-control-parameter-bag`; workspace scope; runner-owned semantic indexing
should emit the model, owning function, and caller evidence for skill validation.

## Open questions

None identified.
