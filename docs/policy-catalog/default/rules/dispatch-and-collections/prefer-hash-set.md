# prefer-hash-set

## Classification
Reported default dispatch/collections policy with constructor, type-reference, and mutable-module findings.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`; findings also feed `imperative-state-manager`.

## Implementation sources
`packages/guidance/src/policies/preferHashSet.ts`; `packages/matchers/src/builtins/preferHashSet.ts`; `packages/matchers/src/builtins/hashCollectionMatches.ts`; `packages/matchers/src/support/tsSignature.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Use immutable Effect `HashSet` for owned collections while preserving external Set contracts.

## Detection boundary
Reports bare `new Set`, written `Set`/`ReadonlySet` type references, and `MutableHashSet` imported from `effect`, `effect/MutableHashSet`, or accessed through an Effect namespace. Constructor/type candidates are suppressed when semantic escape analysis shows an external boundary.

## Exemptions and non-findings
Allows Set construction passed to or flowing into an external API, ambient type mirrors, third-party input converted at the boundary, custom Set classes, WeakSet, and immutable `HashSet`.

## Guidance
Use immutable `HashSet` constructors/updates; preserve reference identity with explicit Equal/Hash wrappers when needed; use built-in Set only at a required external contract.

## Dependencies
TypeScript checker, call-signature/declaration provenance, construction/type-reference escape analysis, import analysis, and shared hash-collection matcher.

## Tests and examples
`tests/preferHashSet.test.ts`; `tests/fixtures/prefer-hash-set/`; `packages/guidance/examples/prefer-hash-set/` (local and boundary pairs).

## Skill migration
Proposed `lint-rule-prefer-hash-set`; local finding with cross-call semantic escape scope; requires resolved external signatures, ambient context, import provenance, and dataflow used by escape helpers; dispatch/collections fleet, semantic candidate phase; deterministic candidate generation can reuse the shared hash matcher.

## Open questions
None identified.
