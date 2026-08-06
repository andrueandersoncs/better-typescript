# concept-control

## Classification

Reported default policy; concept-model quality; project-wide relational detection. Its findings also feed aggregate advice.

## Active wiring

First in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**. defaultSpecificAdvice consumes concept-control detections to derive file-level closed-abstraction and directory-level concept-proliferation advice.

## Implementation sources

- packages/guidance/src/policies/conceptControl.ts
- packages/guidance/src/policies/conceptControlMessages.ts
- packages/guidance/src/policies/conceptControlHints.ts
- packages/guidance/src/conceptControl/conceptProliferation.ts
- packages/matchers/src/builtins/conceptControl/conceptControl.ts
- packages/matchers/src/builtins/conceptControl/conceptIndex.ts
- packages/matchers/src/builtins/conceptControl/data.ts

## Intent

Detect weak, duplicated, speculative, or function-shaped first-party data concepts before documentation can legitimize them.

## Detection boundary

Builds a Program-wide index of named classes, enums, data-carrying interfaces/type aliases, and Effect data/schema classes; functions; symbol owners/callers; structural roles; comparable shapes; field reads; conversions; and call-seam parameter bags. It emits nine kinds: redundant-alias, closed-abstraction, duplicate-shape, function-derived-model, speculative-export, unused-field, missing-rationale, parameter-bag, and pass-through-conversion. Structural decisions have precedence: redundant, then closed, then duplicate; later checks skip occupied models. A complete rationale is a leading // comment containing because, but prose never suppresses earlier structural evidence.

## Exemptions and non-findings

Shared, boundary, invariant, protocol, or recursive roles exempt the checks that their semantics contradict. Boundary/protocol models skip function-derived, speculative-export, and unused-field checks; boundary/invariant/protocol models skip parameter-bag. Independently read fields, externally consumed exports, transformed conversions, non-data declarations, external sources, and allowed fixtures with supported roles are not findings.

## Guidance

Delete, merge, reuse, localize, or deepen weak concepts; preserve a distinct model only for an independent invariant, protocol, boundary, or evolution path. Never evade a finding with an anonymous object type.

## Dependencies

Whole TypeScript Program; symbol identity and aliases; Effect v4 data/schema recognition; owner/caller and field-read graphs; structural shape normalization; model-role inference; source comments; aggregate advice derivation.

## Tests and examples

- tests/conceptControl.test.ts
- tests/fixtures/concept-control/
- tests/aggregateAdviceExamples.test.ts
- packages/guidance/examples/concept-control/
- packages/guidance/examples/concept-proliferation/

Tests require all nine kinds, verify no allowed-file findings, and cover Effect v4 classes, inherited error fields, duplicate classes/interfaces/tuples, conversions, parameter bags, and rationale.

## Skill migration

- Proposed skill: lint-rule-concept-control
- Scope: workspace/project
- Required semantic context: complete declaration, ownership, caller, role, shape, field-read, conversion, and comment index
- Runner phase/fleet: indexed relational detection / concepts-composition, before aggregate advice
- Deterministic candidate generation: preserve buildConceptIndex and conceptControlMatcher; emit normalized ConceptSignalData for agent validation and aggregate consumption

## Open questions

None identified.
