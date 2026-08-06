# prefer-hash-map

## Classification
Reported default dispatch/collections policy with constructor, type-reference, and mutable-module findings.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`; findings also feed `imperative-state-manager`.

## Implementation sources
`packages/guidance/src/policies/preferHashMap.ts`; `packages/matchers/src/builtins/preferHashMap.ts`; `packages/matchers/src/builtins/hashCollectionMatches.ts`; `packages/matchers/src/support/tsSignature.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Use immutable Effect `HashMap` for owned maps while preserving external Map contracts.

## Detection boundary
Reports bare `new Map`, written `Map`/`ReadonlyMap` type references, and `MutableHashMap` imported from `effect`, `effect/MutableHashMap`, or accessed through an Effect namespace. Constructor/type candidates are suppressed when semantic escape analysis shows an external boundary.

## Exemptions and non-findings
Allows Map construction passed to or flowing into an external API, ambient type mirrors, third-party input converted at the boundary, custom Map classes, WeakMap, and immutable `HashMap`.

## Guidance
Use immutable `HashMap` constructors/updates; preserve reference identity with explicit Equal/Hash wrappers when needed; use built-in Map only at a required external contract.

## Dependencies
TypeScript checker, call-signature/declaration provenance, construction/type-reference escape analysis, import analysis, and shared hash-collection matcher.

## Tests and examples
`tests/preferHashMap.test.ts`; `tests/fixtures/prefer-hash-map/`; `packages/guidance/examples/prefer-hash-map/` (local and boundary pairs).

## Skill migration
Proposed `lint-rule-prefer-hash-map`; local finding with cross-call semantic escape scope; requires resolved external signatures, ambient context, import provenance, and dataflow used by escape helpers; dispatch/collections fleet, semantic candidate phase; deterministic candidate generation can reuse the shared hash matcher.

## Open questions
None identified.
