# ADR-0017: Paradigm-split Architecture Explore fleets

## Status

Accepted

## Date

2026-07-16

## Context

Architecture Explore began as one Wiring whose silent evidence and derived Advice assumed a mixed
object-oriented and functional codebase. That shape forced every consumer of
`architectureExploreWiring` to pay for both paradigms' checks, and it encouraged checks to grow
paradigm heuristics so a single fleet could interpret OOP construction seams and FP composition
seams alike.

Meanwhile, solution-style workspaces need test-aware and cross-package Advice without violating
ADR-0013's bounded workspace model: project references are walked sequentially with one `ts.Program`
alive at a time. A second Program index for cross-package callers would reintroduce the memory
failure mode ADR-0013 closed. Evidence that only sees production projects also silently blinds
test-past-interface and related Advice.

Existing Architecture Explore signal names remain pinned by ADR-0008 and ADR-0011 report keys.
ADR-0005 still forbids per-check options, so thresholds cannot become config knobs.

## Decision

### Core, OOP, and FP check sets with three wirings

`@better-typescript/checks/preset/architectureExploreWiring` exports paradigm-partitioned check sets
and wirings:

- `architectureExploreCoreChecks` — paradigm-neutral evidence: `pass-through-wrappers`,
  `interface-burden`, `module-graph`, `test-only-exports`, `seam-leakage-evidence`, `import-usage`,
  `module-identity`, `export-surface`;
- `architectureExploreOopChecks` — `external-dependency-construction`, `single-adapter-seams`;
- `architectureExploreFpChecks` — `composition-forwarders`, `module-scope-effects`,
  `context-tag-seams`, `composition-fingerprints`;
- `architectureExploreChecks` — the union of core, OOP, and FP checks (back-compat);
- `architectureExploreDerive` — one shared derive over whatever Signals are present; advisers
  tolerate absent evidence from an unwired paradigm set;
- `architectureExploreOopWiring` — core+oop checks with the shared derive;
- `architectureExploreFpWiring` — core+fp checks with the shared derive;
- `architectureExploreWiring` — union wiring (back-compat / mixed paradigms).

Users opt into a paradigm by assigning `architectureExploreOopWiring` or
`architectureExploreFpWiring` in a config entry. Mixing paradigms uses `architectureExploreWiring`.
Each check stays one-shaped: it records one evidence kind for one paradigm or for the shared core,
and never branches on "is this OOP or FP?" inside a single check body.

Derived Advice that depends on the new evidence includes registration ceremony (≥15 imports, ≥80%
referenced ≤2 times), hub module (≥12 operations, fan-in ≥3, fan-out ≥6), invisible tests (no test
file visible workspace-wide), duplicated orchestration (same ≥3-step composition fingerprint in ≥2
files), directory-level leaked seam (bidirectional directory pairs), hypothetical seam coverage for
Effect `Context.Tag` / Service seams including dead seams, cross-package test-past-interface joins,
deletion-test / wide-shallow / bounce treatment of curried `pipe` composition forwarders as
shallowness, and hard-to-test hotspot counting of module-scope IO and `Effect.run*` outside
composition roots.

### Workspace-relative evidence and derive-level joins

Workspace evidence carries workspace-relative paths. Cross-package caller evidence joins
`import-usage` specifiers to `module-identity` aliases (`package.json` exports plus
`outDir`/`rootDir` mapping) at the derive layer. Analysis does not construct extra Programs for that
join. This keeps Architecture Explore consistent with ADR-0013's one-Program-alive workspace bound.

### Evidence horizon includes test projects

Analysis walks the root `tsconfig.json` project references. Test projects must be referenced for
test-aware Advice. When no test file is visible across that horizon, derive emits project-level
`invisible tests` Advice instead of silently omitting test evidence.

### Thresholds stay fixed; signal names stay pinned

Advice thresholds are fixed constants in derive. They are not per-check options; ADR-0005 forbids
that seam. Existing check signal names are not renamed: NDJSON report keys remain pinned by ADR-0008
and ADR-0011.

## Alternatives Considered

### One monolithic fleet with per-check paradigm heuristics

- Pros: one wiring export and no user choice between OOP and FP.
- Cons: every project pays for both paradigms; individual checks grow branching heuristics; Advice
  becomes harder to justify as one-shaped evidence.
- Rejected: end-users opt in per paradigm, and each check records one evidence shape.

### Multi-Program workspace index

- Pros: cross-package caller resolution could query a live index of every project Program.
- Cons: reintroduces eager or retained multi-Program memory pressure that ADR-0013 measured and
  rejected.
- Rejected: keep one Program alive and join workspace-relative evidence in derive.

### Rename existing check signal names

- Pros: names could mirror the paradigm split more literally.
- Cons: NDJSON keys and derivation lookups are already pinned for consumers and self-host baselines.
- Rejected: retain existing signal names; add new names only for new evidence checks.

## Consequences

- Config authors choose `architectureExploreOopWiring`, `architectureExploreFpWiring`, or the union
  `architectureExploreWiring` per wiring entry.
- `architectureExploreDerive` remains shared; missing paradigm Signals do not fail derivation.
- Solution roots that omit test project references get visible `invisible tests` Advice rather than
  blind test-related Advice.
- Cross-package joins stay in derive under ADR-0013's memory bound.
- New Architecture Explore thresholds remain code constants, not config options.
- Existing Architecture Explore signal names remain stable for NDJSON and `signalOf` consumers.
