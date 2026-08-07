# missing-rationale

## Classification

Reported `concept-control` rule kind; declaration-level rationale fallback.

## Active wiring

Emitted by the reported `concept-control` policy in `conceptAndCompositionPolicies` and
`defaultWiring`. Unlike the other non-closed kinds, it does not feed `concept proliferation`.

## Implementation sources

- `packages/guidance/src/policies/conceptControl.ts`
- `packages/guidance/src/policies/conceptControlMessages.ts`
- `packages/guidance/src/policies/conceptControlHints.ts`
- `packages/matchers/src/builtins/conceptControl/conceptControl.ts`
- `packages/matchers/src/builtins/conceptControl/conceptIndex.ts`
- `packages/matchers/src/builtins/conceptControl/data.ts`

## Intent

Require a surviving first-party model to state why existing concepts are insufficient after stronger
structural checks have found no concrete defect.

## Detection boundary

Reports an otherwise undecided model when its leading single-line comment prose does not contain
`because`, case-insensitively. Multiple adjacent leading `//` comments are joined before checking.

## Exemptions and non-findings

A leading single-line rationale containing `because` is accepted. Models already reported as
function-derived, speculative, unused-field, redundant, closed, or duplicate return before this
fallback. Block comments and distant comments do not satisfy it.

## Guidance

Delete or reuse the concept first. If it remains, add one direct single-line rationale using
`because` to explain why existing concepts do not satisfy its independent semantic need; prose never
suppresses structural evidence.

## Dependencies

The shared `ConceptIndex`, declaration documentation nodes, source comment ranges, and all earlier
concept-control decisions.

## Tests and examples

`tests/conceptControl.test.ts`; `tests/fixtures/concept-control/src/rationale/`;
`tests/fixtures/concept-control/src/allowed/data.ts`.

## Skill migration

Proposed `lint-rule-concept-control-missing-rationale`; file-local candidate validation after all
structural concept skills; deterministic comment extraction should remain runner-owned.

## Open questions

The current test asserts the kind through the combined fixture but does not isolate comment-format
edge cases.
