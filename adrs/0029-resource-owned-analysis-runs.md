# ADR-0029: Resource-owned analysis runs

## Status

Accepted

## Date

2026-08-19

## Context

The CLI composed workspace discovery, eager `loadProject`, root config loading, and linting. In a
solution workspace, `loadProject` retained every TypeScript Program until the whole report finished.
That made the CLI own compiler lifetime and made the convenient programmatic path the memory-heavy
path. Per-project lint results were normalized, but callers also had to know how to normalize the
complete workspace result.

TypeScript Programs have no disposal operation. Releasing one means ending its analysis scope and
dropping every owned strong reference so garbage collection can reclaim its compiler graph.

## Decision

Core exposes `runAnalysis({ projectPath, rules })`. One run:

1. discovers the workspace and its deterministic project order;
2. loads `better-typescript.config.ts` from the discovered root;
3. acquires one Program, lints it completely, and clears the owned Program reference in an Effect
   finalizer before acquiring the next;
4. globally sorts and deduplicates all plain Violations; and
5. returns only the root path and complete Violation array.

The CLI uses this interface. `loadProject` remains available for focused callers that need direct
Program access or compiler-option overrides; those callers own the returned compiler lifetime. Rules
continue to return `Violation[]` unchanged.

## Alternatives Considered

### Keep eager workspace loading in the CLI

Rejected because it retains every compiler graph and duplicates lifecycle and aggregation policy in
callers.

### Expose a Program iterator or compiler-host seam

Rejected because compiler construction does not vary in production. It would widen the interface
only to observe implementation details in tests.

### Remove `loadProject`

Rejected because focused rule tests and programmatic compiler consumers legitimately need loaded
Programs.

## Consequences

- The normal programmatic and CLI path has at most one owned project Program in use at a time.
- Complete output ordering and deduplication no longer depend on project reference order.
- Tests observe project-by-project Rule use, inter-project Program reclamation, and the absence of
  compiler state in results without a compiler-host adapter.
- Direct `loadProject` callers remain responsible for retaining or releasing its Programs.
