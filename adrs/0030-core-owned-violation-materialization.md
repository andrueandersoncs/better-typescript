# ADR-0030: Core-owned Violation materialization

## Status

Accepted

## Date

2026-08-19

## Context

ADR-0027 made Rules return final Violations. That let Rule implementations choose report identity,
level, path normalization, and location serialization even though configuration and complete-output
normalization belong to core. Scanner-backed and direct Rules consequently materialized the same
output contract in different places.

## Decision

A Rule returns local findings. Each finding contains actionable message text and either a TypeScript
node or an explicit source-file position. It contains no Rule identity, configured level, serialized
file path, line, or column.

Core is the sole Violation materializer. It combines each finding with the running Rule and selected
configuration, converts its target to a workspace-relative slash-normalized path and one-based line
and column, then deterministically sorts and exactly deduplicates final Violations.

This keeps the rules-only architecture. It introduces no additional reporting model, aggregate,
silent result, or alternate execution path. Scanner execution and caching remain unchanged.

## Consequences

- Rule authors own recognition, target selection, and actionable prose, but cannot serialize a
  Violation.
- Node and source-position Rules share one path and location implementation.
- Configured identity and level cannot be forged or accidentally retained from Rule output.
- `runAnalysis` still owns complete-workspace normalization after each project is linted.

## Amends

This ADR amends ADR-0027 only where it says Rules return located Violations directly. It also
supersedes ADR-0029's statement that Rules continue to return `Violation[]` unchanged. The
rules-only product model and resource-owned analysis-run decisions remain accepted.
