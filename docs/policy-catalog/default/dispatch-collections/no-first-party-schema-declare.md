# no-first-party-schema-declare

## Classification
Reported default dispatch/collections policy.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noFirstPartySchemaDeclare.ts`; `packages/matchers/src/builtins/noFirstPartySchemaDeclare.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Use structural schemas for owned data while reserving `Schema.declare` for external or opaque contracts.

## Detection boundary
Checks `Schema.declare` calls with at least one argument. Resolves the first predicate's asserted type and reports concrete, non-callable, first-party structural interfaces, classes, or non-opaque type aliases, including aliases of those models.

## Exemptions and non-findings
Allows third-party asserted types, function types, generic type parameters, primitive branded/opaque intersections, and ordinary `Schema.Struct`. Calls not syntactically on identifier `Schema` are not candidates.

## Guidance
Define a `Schema.Struct` and same-named decoded interface; keep `Schema.declare` for third-party or truly opaque validated types.

## Dependencies
TypeScript checker, type-predicate resolution, symbol/declaration provenance, call signatures, and structural/opaque declaration classification.

## Tests and examples
`tests/noFirstPartySchemaDeclare.test.ts`; `tests/fixtures/no-first-party-schema-declare/`; `packages/guidance/examples/no-first-party-schema-declare/`.

## Skill migration
Proposed `lint-rule-no-first-party-schema-declare`; local call finding with project semantic scope; requires asserted-type and declaration-origin analysis; dispatch/collections fleet, semantic candidate phase; deterministic candidate generation can search `Schema.declare` then resolve the predicate type.

## Open questions
None identified.
