# require-result-cardinality-name-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requireResultCardinalityNameConsistency.ts`; `packages/matchers/src/builtins/requireResultCardinalityNameConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Align singular/plural result nouns with one, optional-one, many, or keyed return cardinality.

## Detection boundary
Checks callable definitions with a claimed result noun that agrees with the inferred result concept. Reports confidently plural nouns for singular/optional-one non-object results and confidently singular nouns for many/keyed results; uses conservative English pluralization including `children/people` and regular suffix rules.

## Exemptions and non-findings
Skips unknown cardinality, neutral/ambiguous nouns and suffixes, plural nouns for object-shaped singular results, and result-concept disagreements assigned to other policies.

## Guidance
Rename the result noun to the matcher-provided singular or plural form.

## Dependencies
TypeScript checker and shared callable result-concept/cardinality inference plus local inflection rules.

## Tests and examples
`tests/requireResultCardinalityNameConsistency.test.ts`; `tests/fixtures/require-result-cardinality-name-consistency/`; `packages/guidance/examples/require-result-cardinality-name-consistency/`.

## Skill migration
Proposed `lint-rule-require-result-cardinality-name-consistency`; local callable scope; requires parsed result noun, resolved cardinality and result concept; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
