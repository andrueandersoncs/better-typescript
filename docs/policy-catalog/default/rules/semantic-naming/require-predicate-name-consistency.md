# require-predicate-name-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requirePredicateNameConsistency.ts`; `packages/matchers/src/builtins/requirePredicateNameConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Keep predicate vocabulary and boolean/type-predicate return contracts consistent.

## Detection boundary
Checks callable definitions. Reports predicate-prefix names (`is`, `has`, `can`, `should`, `does`, containment/existence/quantifier words, or `starts/endsWith`) returning non-boolean shapes, and boolean results named with incompatible construction, conversion, lookup, command, or projection operations.

## Exemptions and non-findings
Allows valid boolean/type predicates; noun-only booleans; ambiguous standalone `every`, `match`, `matches`, and `some`; bare `some`/`none` variant constructors; and non-boolean names without a predicate claim.

## Guidance
Either align the return contract or rename with predicate vocabulary; boolean functions with incompatible operations should use a precise predicate name.

## Dependencies
TypeScript checker and shared callable name/result-shape semantics.

## Tests and examples
`tests/requirePredicateNameConsistency.test.ts`; `tests/fixtures/require-predicate-name-consistency/`; `packages/guidance/examples/require-predicate-name-consistency/`.

## Skill migration
Proposed `lint-rule-require-predicate-name-consistency`; local callable scope; requires parsed operation words and resolved boolean/type-predicate result shape; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
