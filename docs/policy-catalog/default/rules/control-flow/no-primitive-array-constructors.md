# no-primitive-array-constructors

## Classification

Reported default policy; Effect collection construction; file-local syntactic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noPrimitiveArrayConstructors.ts
- packages/matchers/src/builtins/noPrimitiveArrayConstructors.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Route all primitive array creation through Effect Array constructors.

## Detection boundary

Reports every array literal, empty or populated, and every call/new expression whose callee is syntactically the bare identifier Array. It does not resolve whether Array is shadowed.

## Exemptions and non-findings

Effect Array.make/of/empty/allocate/fromIterable, Array.isArray, Array.from, typed-array constructors, and namespaced constructors such as ns.Array are not findings.

## Guidance

Use Effect Array.empty, of/make, allocate, or fromIterable according to construction semantics.

## Dependencies

TypeScript array-literal and call/new AST; bare-identifier text matching.

## Tests and examples

- tests/noPrimitiveArrayConstructors.test.ts
- tests/fixtures/no-primitive-array-constructors/
- packages/guidance/examples/no-primitive-array-constructors/

Fixtures and three example pairs cover empty, sized, element, literal, typed, static, and namespaced forms.

## Skill migration

- Proposed skill: lint-rule-no-primitive-array-constructors
- Scope: local file
- Required semantic context: array literal or bare Array call/new syntax
- Runner phase/fleet: syntax detection / control-flow
- Deterministic candidate generation: reuse noPrimitiveArrayConstructorsMatcher

## Open questions

None identified.
