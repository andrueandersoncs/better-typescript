# no-monomorphic-struct-get

## Classification
Reported default dispatch/collections policy.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noMonomorphicStructGet.ts`; `packages/matchers/src/builtins/noMonomorphicStructGet.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Keep `Struct.get` polymorphic until a typed consumer supplies its domain context.

## Detection boundary
Checks non-exported variable declarations with an explicit callable type that has call signatures but no generic signature, and an initializer resolving to Effect `Struct.get` called with one argument through transparent wrappers. Reports the type annotation.

## Exemptions and non-findings
Allows exported declarations, no declaration type, generic callable annotations, `satisfies`, type arguments on the `Struct.get` call without a monomorphic declaration annotation, inline typed consumers, and non-Effect `get` symbols.

## Guidance
Inline `Struct.get` at the consumer or place the domain type on the consuming value/result.

## Dependencies
TypeScript checker, Effect-package declaration provenance, call signatures, modifiers, and expression unwrapping.

## Tests and examples
`tests/noMonomorphicStructGet.test.ts`; `tests/fixtures/no-monomorphic-struct-get/`; `packages/guidance/examples/no-monomorphic-struct-get/`.

## Skill migration
Proposed `lint-rule-no-monomorphic-struct-get`; local variable scope; requires resolved callee provenance and annotation signatures; dispatch/collections fleet, semantic candidate phase; deterministic candidate generation can search typed `Struct.get` initializers then verify symbols.

## Open questions
None identified.
