# no-blank-lines-between-single-line-declarations

## Classification

Reported default policy; declaration layout; file-local syntactic/text detection.

## Active wiring

Last in commentAndDeclarationPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noBlankLinesBetweenSingleLineDeclarations.ts
- packages/matchers/src/builtins/noBlankLinesBetweenSingleLineDeclarations.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Keep adjacent single-line declarations compact inside executable scopes.

## Detection boundary

For the same declaration kinds as the multiline-spacing rule, reports a single-line declaration inside a function when its immediately previous sibling is also a single-line declaration and the intervening text contains an empty line. Nested statement blocks still count as inside the enclosing function.

## Exemptions and non-findings

Module-level declarations, contiguous declarations, a non-declaration neighbor, and gaps involving a multiline declaration are not findings.

## Guidance

Remove the blank line between adjacent single-line declarations while preserving separators around multiline declarations.

## Dependencies

Function-ancestor search, statement-container sibling lookup, source positions, and blank-line regex matching.

## Tests and examples

- tests/noBlankLinesBetweenSingleLineDeclarations.test.ts
- tests/fixtures/no-blank-lines-between-single-line-declarations/
- packages/guidance/examples/no-blank-lines-between-single-line-declarations/

## Skill migration

- Proposed skill: lint-rule-no-blank-lines-between-single-line-declarations
- Scope: local file
- Required semantic context: function ancestry, declaration siblings, and exact interstitial text
- Runner phase/fleet: layout detection / comments-declarations
- Deterministic candidate generation: reuse noBlankLinesBetweenSingleLineDeclarationsMatcher

## Open questions

None identified.
