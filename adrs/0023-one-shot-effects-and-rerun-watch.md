# ADR-0023: One-shot Effects and rerun watch

## Status

Accepted

## Date

2026-07-20

## Context

Better TypeScript used Effect `Stream` values as its internal execution model. A `WorkspaceUpdate`
stream fed report composition, `Wiring.derive` produced an advice stream, and `--watch` preserved
state across batches to emit only changed and cleared blocks. That model was originally intended to
support continuous checking, but the product needs a simpler one-shot CLI with an optional rerun
watch mode. Streaming values, subscriptions, replay, equality gates, and delta state now add
lifecycle and semantic complexity without serving the one-shot result.

The following definitions are authoritative for this migration:

1. **Better TypeScript** is a terminating TypeScript analysis CLI. Its primary operation analyzes
   one current workspace snapshot, writes one complete report, and exits.
2. **Workspace update** is the transient, complete set of `ProgramContext` values used for exactly
   one analysis run. It is an ordinary value obtained by an `Effect`, not an emitted event.
3. **Wiring derivation** is the effectful transformation from one completed `Signal[]` batch to one
   completed `Advice[]` batch. It has the shape
   `ReadonlyArray<Signal> -> Effect<ReadonlyArray<Advice>, E>`.
4. **Report computation** is the effectful transformation from one workspace update to one ordered
   `ReportEvent[]` snapshot. It has the shape
   `WorkspaceUpdate -> Effect<ReadonlyArray<ReportEvent>, E>`.
5. **Watch mode** repeatedly waits for a relevant filesystem change and reruns the complete one-shot
   report. It has no cross-run report state, no signal equality gate, and no delta protocol.

## Decision

### Use Effects for bounded analysis work

All internal APIs that previously produced or transformed `Stream` values use bounded
`Effect<ReadonlyArray<...>>` results when work can fail or own resources. Completed signal and
advice collections remain ordinary immutable arrays at their data boundaries. Check execution stays
synchronous and fused; only compiler construction, derivation, example resolution, reporting,
printing, and watch lifecycle are effectful.

`workspacePrograms.materialize(workspace, compilerOptions)` remains the one owner of the scoped
TypeScript `DocumentRegistry` and LanguageServices. Each report run acquires those resources,
computes the complete report, prints it, and releases them before the next run.

### Make reporting a one-update Effect

The public report composition accepts one `WorkspaceUpdate` value and returns one Effect yielding
ordered report events. The initial-report event projection remains unchanged: a snapshot with blocks
emits one `signal` event per block in presentation order, while an empty snapshot emits exactly one
`empty` event. `cleared` is removed because it only describes a difference from retained prior
state.

### Watch by rerunning the one-shot report

`--watch` first runs the same one-shot report as the default command. It then waits for a filesystem
change beneath the discovered workspace and repeats that full one-shot operation. A successful rerun
always writes the complete current snapshot, including an `empty` event when no signals remain.
There is no incremental TypeScript compiler, source-file diff, workspace-update stream, signal
equivalence comparison, report-block delta, or retained previous report.

Each wait owns one filesystem watcher and closes it after the change or CLI interruption. The
subsequent complete rerun starts a fresh wait; reports never interleave compiler resources or
output.

### Preserve the external output vocabulary that still applies

NDJSON remains the default output and `--pretty` remains a projection of the same event array.
`signal` and `empty` retain their existing payloads and ordering. The historical `rule` and `advice`
key tags remain wire-format compatibility forms. CLI success stays `0`; startup or report failures
stay `2`.

This ADR supersedes ADR-0019's stream input/output seam, ADR-0022's stream-scoped workspace producer
lifetime, and the remaining watch pipeline and delta decisions in ADR-0007 and ADR-0010. It
supersedes ADR-0006 and ADR-0011 where they prescribe Stream-based derivation or reporting. Their
rejections of registries, schedulers, metadata-driven dependency graphs, suppressions, severities,
and result-based exit gating remain accepted.

## Alternatives Considered

### Retain stream composition and collect once

- Pros: fewer call-site edits.
- Cons: preserves a continuous abstraction, subscription lifetime, replay operators, and a second
  semantic form for data that is always bounded in this product.
- Rejected: a collected stream is a less direct representation of one finite computation than an
  Effect returning an array.

### Keep delta events while recreating the compiler per watch run

- Pros: less stdout for unchanged reports.
- Cons: still requires prior-report identity, content comparison, clearing semantics, and retained
  state across runs.
- Rejected: watch should be repeated one-shot analysis, not an incremental report protocol.

### Restart a child CLI process for every change

- Pros: literal process-level reruns and strong isolation.
- Cons: configuration parsing, command startup, and output handling become process orchestration;
  errors and cancellation have a second lifecycle.
- Rejected: rerunning the same scoped report Effect preserves the one-shot semantics without
  unnecessary child-process machinery.

### Remove `--watch`

- Pros: smallest implementation.
- Cons: removes a useful interactive capability.
- Rejected: watch remains valuable when its semantics are explicit full snapshots.

## Consequences

- Internal production contracts contain no `Stream` types or operations.
- Derivations and report helpers compose bounded arrays through Effects, making ownership and
  failure types explicit.
- Each watch-triggered run creates and releases fresh TypeScript compiler state; it does not retain
  prior program or report state.
- Watch output is a sequence of complete snapshots. Consumers that need to know a previous block
  disappeared compare successive snapshots themselves.
- Tests cover one-shot report ordering, rerun watch behavior, watcher cleanup, and the absence of
  stale state across runs.
- Existing fixtures and checks may continue to mention `Stream` when they intentionally analyze
  external user code that uses Effect streams; those are test data, not Better TypeScript's runtime
  execution architecture.
