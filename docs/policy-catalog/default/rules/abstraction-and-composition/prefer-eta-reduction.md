# prefer-eta-reduction

## Classification

Reported default policy; function composition; file-local semantic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEtaReduction.ts
- packages/matchers/src/builtins/preferEtaReduction.ts
- packages/matchers/src/support/tsNode.ts
- packages/matchers/src/sources/sources.ts

## Intent

Remove arrows that only forward one argument, and turn nested unary forwarding towers into flow.

## Detection boundary

Finds concise arrows with one required identifier parameter whose body is a one-or-more-step unary call tower ending at that parameter. The parameter may not appear in callee expressions. Every callee must be safe to detach: identifiers, partial calls, namespace/static members, and constructor receivers qualify; unbound instance methods do not. One step emits eta, multiple steps emit flow.

## Exemptions and non-findings

Block bodies, rest/default/optional/destructured parameters, multiple-argument calls, property reads, array/object construction, parameter-capturing callees, non-forward adapters, and instance methods requiring this are not findings.

## Guidance

Pass the function/partial directly for one step; use flow with innermost-to-outermost callees for a tower.

## Dependencies

TypeScript symbol/declaration/type analysis for this binding, alias resolution, AST reference counts, and concise-body/carrier unwrapping.

## Tests and examples

- tests/preferEtaReduction.test.ts
- tests/fixtures/prefer-eta-reduction/
- packages/guidance/examples/prefer-eta-reduction/

## Skill migration

- Proposed skill: lint-rule-prefer-eta-reduction
- Scope: local file
- Required semantic context: unary call tower, parameter references, and callee this-binding safety
- Runner phase/fleet: composition detection / concepts-composition
- Deterministic candidate generation: preserve preferEtaReductionMatcher and eta/flow classification

## Open questions

None identified.
