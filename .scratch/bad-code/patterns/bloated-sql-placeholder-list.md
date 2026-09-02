# Long positional SQL value list

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

Avoid hand-written SQL value lists with many positional placeholders and matching argument lists. Use named fields through a typed query builder or another mapping that keeps column names beside values. Short positional statements are allowed.

## Detection

AST: find a SQL string passed to `prepare` whose `VALUES` clause contains at least 10 `?` placeholders, paired with a `run` call containing a long positional argument list.

## Evidence

- Snippets:
  - [007](../snippets/007-hardcoded-timestamps-in-db-migration.md)
- Allowed nearby:
  - A short positional statement
  - SQL and bindings generated from one typed field mapping

## Overlap

No built-in rule owns long positional SQL bindings.

## Decision

- 2026-09-02: Prospective from one snippet.
