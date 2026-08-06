# no-long-comments

## Classification

Reported default policy; comment length; file-local lexical detection.

## Active wiring

Listed in commentAndDeclarationPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noLongComments.ts
- packages/matchers/src/builtins/noLongComments.ts
- packages/matchers/src/sources/comments.ts

## Intent

Keep comments within the size of a code annotation and move extended reasoning to ADRs.

## Detection boundary

Reports a scanned comment token when its raw source slice, including comment delimiters and internal newlines, is longer than 100 JavaScript string code units. Exactly 100 is allowed.

## Exemptions and non-findings

Comments of 100 characters or fewer are not findings. There are no form-specific exemptions.

## Guidance

State the single load-bearing reason within 100 characters or move the explanation to adrs/.

## Dependencies

Custom sourceComments scanning and raw commentText slicing.

## Tests and examples

- tests/noLongComments.test.ts
- tests/fixtures/no-long-comments/
- packages/guidance/examples/no-long-comments/

## Skill migration

- Proposed skill: lint-rule-no-long-comments
- Scope: local file
- Required semantic context: exact raw comment token text
- Runner phase/fleet: lexical detection / comments-declarations
- Deterministic candidate generation: reuse noLongCommentsMatcher and its 100-character constant

## Open questions

None identified.
