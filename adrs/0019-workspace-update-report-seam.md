# ADR-0019: Workspace Update to Report Event seam

## Status

Accepted. [ADR-0022](0022-shared-one-shot-compiler-state.md) supersedes only the single compiler
producer and one-shot `Stream.take` implementation; the Workspace Update-to-Report Event seam,
report composition, and module ownership remain accepted.

## Date

2026-07-16

## Context

The core execution path accumulated public functions around intermediate representations rather than
one end-to-end reporting seam:

- `report.ts` became a hub for wiring construction, signal execution, report rendering, and runner
  composition;
- `loadProject` exposed a three-by-two matrix of report projections over loaded workspaces and
  workspace configs;
- watch mode hardwired its TypeScript producer while exporting test-only pipeline stages;
- the CLI maintained separate one-shot and watch branches even though both eventually emitted the
  same report events;
- callers hand-merged check arrays and derive streams, making it easy to compose only half of a
  `Wiring`; and
- `loadWiringConfig` duplicated validation and construction paths and retained a Context service
  with no varying adapter.

Tests could bypass the production interface by calling projections or watch stages directly, while
the actual filesystem producer received less direct evidence. The wide surface obscured the useful
boundary: reporting consumes a sequence of complete workspace snapshots and emits report
transitions.

## Decision

### Core modules own one concept each

The public engine is split by domain ownership:

- **wiring** owns Check identity, configuration, validation, and whole-Wiring composition;
- **signal** owns Check execution results and Signal lookup;
- **report** owns report rendering and Report Event vocabulary; and
- **watch** owns Workspace Update production and Workspace Update-to-Report Event composition.

Moving these concepts out of the former report hub is a clean ownership cutover. Public imports use
the owning subpath; the report module is not a compatibility barrel for wiring, signal, or watch
operations.

### Reporting accepts a Workspace Update stream

A `WorkspaceUpdate` is one consistent workspace-wide snapshot containing the current project
contexts in project order. The public composition boundary is:

```ts
reportEvents(config)(updates: Stream<WorkspaceUpdate>)
```

`workspaceUpdates(workspace, watchOptions)` is the production adapter from a discovered workspace
and TypeScript watch options to that stream. Tests and other programmatic callers may provide
synthetic `Stream<WorkspaceUpdate>` values directly. They do not need a hypothetical compiler-host
interface or access to an internal stage.

The CLI constructs the producer once. One-shot mode applies `Stream.take(updates, 1)` before
`reportEvents`; watch mode consumes the same producer continuously. Both modes therefore use the
same full recompute, derivation, rendering, empty-report, equality, and delta semantics. Signal
updates, report-block updates, and block-delta stages remain private. One real-filesystem producer
smoke test covers startup and an observed update; synthetic streams provide deterministic coverage
of report transitions.

### Project loading retains six useful operations

`loadProject` keeps only these public operations:

- `discoverWorkspace`;
- `loadProjectConfig`;
- `contextFromLoadedProject`;
- `workspaceSignalsFromConfigs`;
- `runCheckOnProject`; and
- `loadProject`.

The six report projections and the `astNodes` and `checkableSourceFiles` wrappers are removed. A
caller that needs reporting crosses the Workspace Update stream seam; a focused low-level caller can
still load a project or run a Check without importing report vocabulary.

### Composition and config loading have one path

`mergeWirings` composes complete `Wiring` values. It concatenates Checks in caller order and
combines each member's derive stream over the same completed Signal batch, so callers cannot merge
enrollment while silently dropping derivation.

`loadWiringConfig` selects the supported module export shape, resolves a factory when present, then
uses one decode-and-construction path for validation, defaults, name uniqueness, and errors. It has
no Context service because production and tests do not provide distinct config-loading adapters.

This design preserves [ADR-0007](0007-continuous-watch-analysis.md)'s consistent-batch,
full-recompute, and change-gate correctness decisions. It preserves
[ADR-0013](0013-fused-dispatch-and-bounded-workspaces.md)'s fused dispatch, bounded sequential
workspace lifetime, and focused loaded-workspace interface, as well as
[ADR-0015](0015-glob-specific-wiring-configuration.md)'s `WiringConfig`, glob matching, independent
derivation, and ordering semantics.

This ADR supersedes only [ADR-0015](0015-glob-specific-wiring-configuration.md)'s public runner
naming and cutover clause: the `reportFromConfig`, `reportBlocksFromConfig`,
`reportEventsFromConfig`, and `watchReportFromConfig` runner set is replaced by `reportEvents` over
a Workspace Update stream plus `workspaceUpdates` as the production adapter. ADR-0015's removal of
per-Check path scoping, config loader name and error, and all glob decisions remain accepted.

## Alternatives Considered

### Keep the projection matrix

- Pros: each loaded/config and block/event combination has a direct function.
- Cons: callers choose an execution representation and projection together, expanding the interface
  and encouraging tests to stop before the production boundary.
- Rejected: one update-stream input and one event-stream output cover those combinations by
  composition.

### Inject a compiler-host seam

- Pros: filesystem and compiler behavior could be replaced wholesale in tests.
- Cons: there is only one production adapter, and a fake compiler host would expose far more
  TypeScript lifecycle detail than reporting needs.
- Rejected: synthetic Workspace Updates are the smaller real seam.

### Maintain a separate snapshot pipeline

- Pros: one-shot execution can avoid watch vocabulary.
- Cons: duplicates recompute, rendering, and empty-report behavior and risks divergence from the
  first watch batch.
- Rejected: taking the first update states the only mode difference directly.

### Retain test-only stage exports

- Pros: unit tests can isolate signal, report-block, and delta transformations.
- Cons: implementation stages become public obligations and tests can pass while their composition
  or real producer fails.
- Rejected: test the deep public transformation with synthetic updates and smoke the production
  adapter once.

## Consequences

- One-shot, watch, benchmark, and synthetic callers all compose through `reportEvents`.
- Production filesystem watching is replaceable at the Workspace Update boundary without inventing a
  compiler abstraction.
- Intermediate pipeline changes do not alter the public API.
- Public module names communicate ownership instead of routing unrelated operations through report.
- Wiring extensions preserve both Checks and derivation through `mergeWirings`.
- Config export shapes share one validation and construction contract.
- Project loading keeps focused analysis tools without a combinatorial reporting surface.
