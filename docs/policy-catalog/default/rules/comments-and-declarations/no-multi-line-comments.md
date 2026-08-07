# no-multi-line-comments

## Classification

Reported default policy; comment form; file-local lexical detection.

## Active wiring

First in commentAndDeclarationPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noMultiLineComments.ts
- packages/matchers/src/builtins/noMultiLineComments.ts
- packages/matchers/src/sources/comments.ts

## Intent

Keep code comments isolated and short; move extended rationale to ADRs.

## Detection boundary

Reports every block-comment token, including one-line /* */ and JSDoc. It also reports the first comment of each run of two or more // comments when only whitespace lies between the comment tokens; blank lines do not break a run.

## Exemptions and non-findings

An isolated // comment is allowed. Two trailing comments with code between them are separate because non-whitespace breaks the run.

## Guidance

Keep one single-line comment that explains why. Delete how-comments and place longer architectural explanations in adrs/.

## Dependencies

The custom TypeScript scanner in sources/comments.ts, including template and regex rescanning, plus onlyBlankBetween.

## Tests and examples

- tests/noMultiLineComments.test.ts
- tests/fixtures/no-multi-line-comments/
- packages/guidance/examples/no-multi-line-comments/

Fixtures cover JSDoc variants, block comments, stacked lines across blank space, trailing comments, and template substitutions.

## Skill migration

- Proposed skill: lint-rule-no-multi-line-comments
- Scope: local file
- Required semantic context: exact comment token positions and intervening source text
- Runner phase/fleet: lexical detection / comments-declarations
- Deterministic candidate generation: expose sourceComments plus noMultiLineCommentsMatcher

## Open questions

None identified.
