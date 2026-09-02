# Monolithic runtime schema

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

A single `Schema.Struct` that aggregates many unrelated configuration concerns (paths, network settings, logging, auth, integration modes, process roles, etc.) into one large definition.

## Detection

AST: find `Schema.Struct` with more than 10 fields spanning at least 5 distinct concern categories.

## Evidence

- Snippets:
  - [001](../snippets/001-runtime-schema.md) — 29 fields covering 10+ concerns
- Allowed nearby:
  - Focused subschemas with 5 or fewer fields each

## Overlap

No built-in rule owns this specific shape.

## Decision

- Initial status: prospective (one evidence snippet)
