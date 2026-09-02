# Hardcoded literal schemas

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

Avoid `Schema.Literals(["literal1", "literal2"])` when `Schema.Literal("single-value")` suffices. Single-value schemas should use the singular form.

## Detection

AST: find `Schema.Literals` call expressions with array literal containing exactly one string.

## Evidence

- Snippets:
  - [001](../snippets/001-runtime-schema.md) — defines integrationMode as Literals(["automatic"])
- Allowed nearby:
  - Literals with 2+ distinct values

## Overlap

No built-in rule owns this specific shape.

## Decision

- Initial status: prospective (one evidence snippet)
