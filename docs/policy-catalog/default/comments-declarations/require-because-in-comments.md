# require-because-in-comments

## Classification

Reported default policy; comment content; file-local lexical detection.

## Active wiring

Listed in commentAndDeclarationPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/requireBecauseInComments.ts
- packages/matchers/src/builtins/requireBecauseInComments.ts
- packages/matchers/src/sources/comments.ts

## Intent

Force every retained comment to state a reason rather than restating mechanics.

## Detection boundary

Reports every scanned comment token whose full token text lacks the Unicode-aware whole word because. Matching is case-insensitive and applies equally to line, block, JSDoc, trailing, empty-block, and end-of-file comments.

## Exemptions and non-findings

Comments containing because as a standalone word are allowed. Because embedded in a longer Unicode identifier-like word does not satisfy the rule. No comment form is exempt.

## Guidance

Delete descriptive comments or rewrite the remaining comment to explain necessity using because.

## Dependencies

Custom sourceComments scanning and a Unicode word-boundary regular expression.

## Tests and examples

- tests/requireBecauseInComments.test.ts
- tests/fixtures/require-because-in-comments/
- packages/guidance/examples/require-because-in-comments/

## Skill migration

- Proposed skill: lint-rule-require-because-in-comments
- Scope: local file
- Required semantic context: exact comment tokens and Unicode-aware text matching
- Runner phase/fleet: lexical detection / comments-declarations
- Deterministic candidate generation: reuse sourceComments and becauseWord matching

## Open questions

None identified.
