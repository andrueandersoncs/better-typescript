# prefer-effect-property-accessors

## Classification

Reported default policy; Effect function idiom; file-local semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectPropertyAccessors.ts
- packages/matchers/src/builtins/preferEffectPropertyAccessors.ts
- packages/matchers/src/support/unaryAdapter.ts

## Intent

Replace named functions that only project one property with reusable Struct.get or Record.get accessors.

## Detection boundary

Finds arrows, function expressions/declarations, and methods recognized as unary adapters: one required identifier parameter and a concise or sole-return body. The returned expression must be a direct, non-optional parameter.property access. Types with index signatures, including every constituent of unions/intersections, select Record; others select Struct.

## Exemptions and non-findings

Multiple/optional/default/rest/destructured parameters, optional access, nested or computed access, and any additional transformation are not findings.

## Guidance

Use Struct.get(key), or Record.get/Record.has for record-like values.

## Dependencies

TypeScript checker, unaryAdapter, index-signature inspection, and function-name recovery.

## Tests and examples

- tests/preferEffectPropertyAccessors.test.ts
- tests/fixtures/prefer-effect-property-accessors/
- packages/guidance/examples/prefer-effect-property-accessors/

## Skill migration

- Proposed skill: lint-rule-prefer-effect-property-accessors
- Scope: local file
- Required semantic context: normalized unary function body and receiver type
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse unaryAdapter and preferEffectPropertyAccessorsMatcher

## Open questions

None identified.
