---
name: map-codebase
description: Build or refresh an evidence-backed map of an unfamiliar codebase, subsystem, or change surface. Use for onboarding, cross-module work, repeated repository work, architecture discovery, or when selective context is insufficient.
---

# Map Codebase

## Inputs

The repository or subsystem scope, desired decisions or handoff, available freshness evidence, and repository conventions.

## Choose depth

- For a local change, map only entry points, callers, contracts, tests, and runtime path that can affect the outcome.
- For onboarding or repeated cross-repository work, create a durable map using the repository's documentation convention.
- For requested durable synthesis, use [technical-documentation](../../../technical-documentation/SKILL.md) with its [reference contract](../../../technical-documentation/references/reference.md). Split and cross-link other document types only when the reader's need changes.

## Method

1. Read steering files, manifests, build commands, package boundaries, and generated/vendor exclusions.
2. Inventory source by module and language. Measure size before partitioning; partition along existing module boundaries.
3. Assign independent regions in parallel only when readers do not need shared evolving state. Require one report shape:
   - responsibility;
   - public interfaces and entry points;
   - dependencies and dependents;
   - data and control flow;
   - tests and runtime checks;
   - risks, unknowns, and evidence paths.
4. Trace important claims to current files and lines. Treat source, not an older map, as authority.
5. Synthesize one map organized for navigation: system overview, modules, key flows, extension seams, commands, and known risks.
6. Mark the source revision and working-tree state. On refresh, re-read changed modules and their dependents; content changes matter even when paths do not.
7. Keep secrets, credentials, build output, vendored code, and irrelevant generated artifacts out of the map.

## Output

A selective or durable codebase map linking the relevant contracts, callers, implementation, tests, runtime paths, and freshness conditions.

## Done

A reader can locate the relevant contract, implementation, tests, and runtime entry point without rescanning the repository. The map states what evidence makes it stale.
