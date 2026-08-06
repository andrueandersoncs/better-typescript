# prefer-inferred-types

## Classification

Reported default policy; declaration inference; project-backed semantic detection.

## Active wiring

Listed in commentAndDeclarationPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferInferredTypes.ts
- packages/matchers/src/builtins/preferInferredTypes.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Remove const, return, and contextually supplied function annotations only when doing so preserves the exact inferred contract.

## Detection boundary

Builds shadow declarations with candidate annotations removed, recompiles a shadow Program, and reports only when annotated and inferred types are mutually assignable, have equal rendered type text, sensitive any/never/unknown flags, call-signature counts, parameter types, and return types, with no diagnostics in the probe block. Candidates are const initializers, non-predicate return annotations, and supported required identifier parameters of contextually typed functions.

## Exemptions and non-findings

Widening or generic-guiding annotations, type predicates, recursive declarations (including transitive function recursion), ambient declarations, let/var, unsupported rest/optional/default/destructured contextual parameters, overloaded/ambiguous function declarations, diagnostics, and inferred signature differences are not findings.

## Guidance

Remove the redundant annotation; contextual findings remove parameter and return annotations together. Retain annotations that widen or intentionally shape inference.

## Dependencies

Whole TypeScript Program, synthetic source edits, shadow compilation, type/signature equivalence, recursion tracing, and a one-Program match cache.

## Tests and examples

- tests/preferInferredTypes.test.ts
- tests/fixtures/prefer-inferred-types/
- packages/guidance/examples/prefer-inferred-types/

Tests rerun with unused diagnostics enabled; examples cover const, return, contextual, widening, generic inference, recursion, and predicates.

## Skill migration

- Proposed skill: lint-rule-prefer-inferred-types
- Scope: cross-file project analysis with file-local findings
- Required semantic context: compiler options, full Program, shadow diagnostics, and exact type/signature equivalence
- Runner phase/fleet: indexed detection / comments-declarations
- Deterministic candidate generation: preserve buildMatchIndex and emit its classified const/return/contextual facts

## Open questions

None identified.
