# speculative-export

## Classification

Reported `concept-control` rule kind; project-wide export-consumer analysis.

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

Detect first-party models exported in anticipation of reuse without an independent consumer or
established external boundary.

## Detection boundary

After structural and function-derived checks, reports an exported model with no owner in another
source file. Boundary and protocol roles suppress the finding.

## Exemptions and non-findings

Nonexported models, models consumed from another source file, boundary/protocol models, and models
already classified by a higher-precedence concept check are not findings. Export syntax alone does
not establish reuse.

## Guidance

Remove the export and keep ownership local, or connect the model to an intentional public seam.
Do not use an export to evade abstraction analysis.

## Dependencies

The shared `ConceptIndex`, export status, owner symbol/source-file resolution, model roles, and all
earlier concept-control decisions.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/speculative/`;
`tests/fixtures/concept-control/src/allowed/`.

## Skill migration

Proposed `lint-rule-concept-control-speculative-export`; workspace scope; generate candidates from
the complete cross-file owner graph before skill validation and aggregation.

## Open questions

None identified.
