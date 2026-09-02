# Boilerplate existence checks

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

Avoid families of utility functions that differ only by the property whose presence they test. Replace them with a shared typed helper. A single domain-specific predicate is allowed.

## Detection

Find multiple functions with the same parameter type whose bodies differ only by a property name in `<parameter>.<property>.length > 0` or `Option.isSome(<parameter>.<property>)`.

## Evidence

- Snippets:
  - [003](../snippets/003-boilerplate-existence-checks.md)
- Allowed nearby:
  - One predicate with domain-specific behavior

## Overlap

No built-in rule owns families of repeated presence predicates.

## Decision

- 2026-09-02: Prospective from one snippet.
