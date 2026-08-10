# mixed-physical-module

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; produces findings when `semantic-module-placement` evidence is active.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/architectureExploreDerive.ts`
- Evidence: `semantic-module-placement`

## Intent

Report a Physical Module that holds members of more than one Semantic Module.

## Detection boundary

Group mixed placement evidence by file and emit one block per file, listing each resident Semantic
Module with its anchor and complete ordered membership, plus the count of Code Entities in the file.

## Exemptions and non-findings

A file holding exactly one Semantic Module produces nothing, no matter how many entities it declares.
The advice separates modules without splitting any listed membership and infers no destination or
move direction.

## Guidance

Separate the listed Semantic Modules into distinct Physical Modules.

## Dependencies

Consumes semantic-module-placement evidence.

## Tests and examples

- `tests/semanticModulePlacementAdvice.test.ts`
- `packages/guidance/examples/semantic-module-placement/`

## Skill migration

Proposed skill: `lint-rule-mixed-physical-module`. Scope: Program/file. Consume the deterministic
partition; an agent names the new files the advice deliberately withholds.

## Open questions

Whether a file holding one large module plus one singleton deserves a distinct remediation shape.
