# Abstract class with readonly data properties

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

Avoid an abstract class whose members are only abstract readonly data properties. Use an interface for a data-only contract. An abstract class with shared behavior or protected extension hooks is allowed.

## Detection

AST: find an abstract class whose non-constructor members are all abstract readonly property declarations and which declares no behavior.

## Evidence

- Snippets:
  - [006](../snippets/006-abstract-class-config.md)
- Allowed nearby:
  - An abstract class with concrete behavior or protected extension hooks

## Overlap

`no-first-party-root-class` allows classes with an `extends` clause and does not own data-only abstract classes. `schema-class-models` covers schema model declarations, not configuration contracts.

## Decision

- 2026-09-02: Prospective from one snippet.
