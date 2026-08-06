# interface-burden

## Classification

Silent file-level architecture evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/interfaceBurden.ts`
- Matcher: `packages/matchers/src/builtins/interfaceBurden.ts`
- Evidence: `InterfaceBurdenData` in `packages/matchers/src/builtins/architectureExploreData.ts`

## Intent

Measure the callable knowledge exposed by one Physical Module without treating size alone as a
defect.

## Detection boundary

Emit one fact when a file exposes at least four operations across exported functions, exported
function-valued variables, callable object-literal members, and exported classes. Count public
methods, accessors, constructors, and an implicit constructor. Sum required parameters, excluding
optional, defaulted, and rest parameters.

## Exemptions and non-findings

Ignore non-exported declarations, private and protected class members, non-callable object
properties, implementation size, and surfaces below four operations.

## Guidance

Use operation and required-parameter counts only with structural evidence; interface size is not a
depth verdict.

## Dependencies

Consumed by wide shallow interface and hub module.

## Tests and examples

- `tests/architectureEvidence.test.ts`
- No dedicated user-facing example.

## Skill migration

Keep as deterministic evidence shared by architecture skills. It requires AST export visibility and
parameter-shape analysis; run once per file in the architecture evidence phase.

## Open questions

None identified.
