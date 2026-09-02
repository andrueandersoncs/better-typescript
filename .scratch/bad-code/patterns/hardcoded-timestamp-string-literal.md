# Hardcoded current timestamp literal

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

Do not represent the current operational time with a fixed ISO timestamp literal. Read time from an injected clock or the runtime. Intentionally fixed timestamps in fixtures and expected values are allowed.

## Detection

AST: find an ISO timestamp string literal assigned to a variable named `now` or `currentTime` outside test fixtures.

## Evidence

- Snippets:
  - [007](../snippets/007-hardcoded-timestamps-in-db-migration.md)
- Allowed nearby:
  - A fixed timestamp used as fixture input or an expected value

## Overlap

`test-clock-for-time` checks real Effect delays in tests, not fixed timestamp literals. No built-in rule owns this shape.

## Decision

- 2026-09-02: Prospective from one snippet.
