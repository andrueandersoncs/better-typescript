# Monolithic runtime schema

- Status: rejected
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-03

## Invariant

A single `Schema.Struct` that aggregates many unrelated configuration concerns (paths, network settings, logging, auth, integration modes, process roles, etc.) into one large definition.

## Detection

undetectable: syntax and checker facts cannot determine whether fields belong to unrelated concerns, and a field-count threshold would be arbitrary.

## Evidence

- Snippets:
  - [001](../snippets/001-runtime-schema.md) — 29 fields covering 10+ concerns
- Allowed nearby:
  - Focused subschemas with 5 or fewer fields each

## Overlap

No built-in rule owns this specific shape.

## Decision

- Initial status: prospective (one evidence snippet)
- 2026-09-03: Rejected because one example does not establish a predictable boundary and the proposed concern-based detection is not mechanically reliable.
