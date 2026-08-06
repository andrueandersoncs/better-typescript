# require-lookup-totality-name-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requireLookupTotalityNameConsistency.ts`; `packages/matchers/src/builtins/requireLookupTotalityNameConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Make lookup names state whether absence is possible.

## Detection boundary
Checks callables with known result totality. Reports optional claims beginning `find/lookup/maybe/optional` when the result is total, and total claims beginning `require/unsafe/getOrThrow/getOrElse` when the result is optional (`Option`, nullish, or equivalent inferred totality).

## Exemptions and non-findings
Skips unknown totality, matching claims, neutral lookup vocabulary such as `get/read/by`, and names outside the recognized prefixes.

## Guidance
Change the result to match the absence claim or remove/change the totality word.

## Dependencies
TypeScript checker and shared callable name/result-totality inference.

## Tests and examples
`tests/requireLookupTotalityNameConsistency.test.ts`; `tests/fixtures/require-lookup-totality-name-consistency/`; `packages/guidance/examples/require-lookup-totality-name-consistency/`.

## Skill migration
Proposed `lint-rule-require-lookup-totality-name-consistency`; local callable scope; requires parsed prefixes and resolved optional/total result semantics; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
