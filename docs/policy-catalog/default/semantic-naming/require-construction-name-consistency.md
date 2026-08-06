# require-construction-name-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requireConstructionNameConsistency.ts`; `packages/matchers/src/builtins/requireConstructionNameConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Reserve construction vocabulary for fresh construction and name actual constructors as such.

## Detection boundary
Checks callable definitions. Reports `make/create/build/construct` claims whose body is lookup/projection rather than construction, and construction-role bodies without factory vocabulary when the claimed result noun agrees or is absent.

## Exemptions and non-findings
Allows real factories, bare `make`, exact variant constructors `fail/left/none/of/right/some/succeed`, ordinary lookup/projection names, and constructed results whose unrelated noun disagreement belongs to another naming policy.

## Guidance
Rename false factories with lookup/projection language or construct a fresh value; rename unnamed constructors with construction vocabulary.

## Dependencies
TypeScript checker and shared callable role, operation, result-concept, lookup, projection, and construction inference.

## Tests and examples
`tests/requireConstructionNameConsistency.test.ts`; `tests/fixtures/require-construction-name-consistency/`; `packages/guidance/examples/require-construction-name-consistency/`.

## Skill migration
Proposed `lint-rule-require-construction-name-consistency`; local callable scope; requires body-derived semantic roles, parsed name, and resolved result concept; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
