# require-blank-lines-around-multiline-declarations

## Classification

Reported default policy; declaration layout; file-local syntactic/text detection.

## Active wiring

Listed in commentAndDeclarationPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/requireBlankLinesAroundMultilineDeclarations.ts
- packages/matchers/src/builtins/requireBlankLinesAroundMultilineDeclarations.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Visually separate multi-line declarations from adjacent statements.

## Detection boundary

For variable, function, class, interface, type-alias, enum, and module declaration statements, compares start/end source lines. A multi-line declaration is reported when either existing sibling lacks an empty line in the intervening text.

## Exemptions and non-findings

Single-line declarations are not findings. The first sibling needs no blank line above, the last needs none below, and a sole declaration needs neither outer separator.

## Guidance

Insert an empty line above and below the declaration where a neighboring statement exists.

## Dependencies

Statement-container sibling lookup, declaration classification, source positions, and blank-line regex matching.

## Tests and examples

- tests/requireBlankLinesAroundMultilineDeclarations.test.ts
- tests/fixtures/require-blank-lines-around-multiline-declarations/
- packages/guidance/examples/require-blank-lines-around-multiline-declarations/

## Skill migration

- Proposed skill: lint-rule-require-blank-lines-around-multiline-declarations
- Scope: local file
- Required semantic context: declaration/sibling AST and exact interstitial text
- Runner phase/fleet: layout detection / comments-declarations
- Deterministic candidate generation: reuse requireBlankLinesAroundMultilineDeclarationsMatcher

## Open questions

None identified.
