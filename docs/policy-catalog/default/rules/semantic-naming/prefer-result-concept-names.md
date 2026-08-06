# prefer-result-concept-names

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/preferResultConceptNames.ts`; `packages/matchers/src/builtins/preferResultConceptNames.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Make a callable's claimed result noun describe the concept actually returned.

## Detection boundary
Checks function declarations, function-valued variables, functions, arrows, and methods whose callable semantics show a projection and a non-boolean result. Reports when the parsed result noun disagrees with all type/body-derived expected result words.

## Exemptions and non-findings
Skips callables without a parsed result noun, without projection evidence, with boolean results, or with an agreeing noun. Directional names, plural collection nouns, wrappers, branch-dependent projections, and construction are covered by fixture non-findings.

## Guidance
Rename the result phrase to the returned concept while retaining operation/source qualifiers; use `resultFromSource` or `sourceToResult` where direction matters.

## Dependencies
TypeScript checker plus shared callable name, role, projection, result-shape, and concept inference.

## Tests and examples
`tests/preferResultConceptNames.test.ts`; `tests/fixtures/prefer-result-concept-names/`; `packages/guidance/examples/prefer-result-concept-names/`.

## Skill migration
Proposed `lint-rule-prefer-result-concept-names`; local callable scope; requires AST, resolved return/source types, parsed name words, and projection/concept evidence; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
