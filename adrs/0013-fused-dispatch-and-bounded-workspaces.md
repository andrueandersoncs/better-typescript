# ADR-0013: Fused check dispatch and bounded workspaces

## Status

Accepted. The built-in authoring consequence is superseded by
[ADR-0018](0018-check-owned-authoring-and-package-examples.md). Its fused execution, full-recompute,
bounded-workspace, and loaded-workspace decisions remain accepted through
[ADR-0019](0019-workspace-update-report-seam.md).

## Date

2026-07-13

## Context

ADR-0006 represented each Check as an independent AST-stream transformer and rejected a fused
dispatcher until measurements showed that direct streams were unusable. That threshold has been
crossed:

- the four-file benchmark replayed 1,863 materialized AST-node wrappers through 65 Checks and
  averaged 790.981 ms per report;
- `workspaceSignals` alone allocated roughly 395 MB during one cold benchmark pass;
- loading Effect's solution config eagerly constructed 110 `ts.Program` values and exhausted Node's
  4 GB heap before analysis;
- 23 of those 110 project configs were duplicate paths reached through the reference graph;
- AST traversal used JavaScript recursion, making valid deeply nested syntax a call-stack failure
  mode.

The bottleneck was architectural, not a local slow expression: the engine multiplied every node by
every Check, retained every node and project Program, and rebuilt expensive program indexes for
unchanged Programs.

## Decision

Checks are declarative subscription plans, not arbitrary stream transformers. A Check exposes a plan
from `ProgramContext` to file and node subscriptions. The engine compiles all active plans together,
dispatches node handlers by `SyntaxKind`, and traverses each source file once. Detection order
remains file-major and subscription-major within each Check.

Program-indexed plans are memoized in a latest-entry cache backed by an Effect `Ref`. Program
identity remains snapshot identity in both loaded and watch paths, so repeated analyses of the
current snapshot reuse their indexes while the single-entry bound releases a superseded Program as
soon as the next snapshot is planned. Each indexed Check owns its cache instead of sharing
module-global mutable state.

One-shot solution workspaces are analyzed through `WorkspaceConfigs`. Project configs are
deduplicated by resolved config path, and each `ts.Program` is constructed, analyzed, and released
before the next config is loaded. The loaded-workspace interface remains for focused library and
test callers. Watch batches cache one latest `ProgramContext` per project rather than materialized
`AstNodeElement` chunks.

AST traversal uses an explicit persistent stack. It preserves TypeScript's depth-first pre-order
without depending on the JavaScript call stack. The report path no longer materializes per-node
wrappers.

Shared source-file indexes use latest-entry caches backed by Effect `Ref` values. File-major fused
dispatch makes one entry sufficient: comment Checks consume the same immutable `ts.SourceFile`
contiguously, then the next file replaces it.

The benchmark enforces a 100 ms mean report budget for its repeatable single-program fixture.
Multi-project targets use one bounded sequential pass instead of eagerly loading or repeatedly
rebuilding every Program.

This decision supersedes ADR-0006's independent Check stream-transformer representation and
fused-dispatch rejection. It also supersedes ADR-0007's materialized AST snapshot cache; its
consistent-batch and full-recompute correctness decisions remain.

## Alternatives Considered

### Micro-optimize the existing stream pipeline

- Pros: no interface change.
- Cons: cannot remove the fundamental 65-by-node replay, whole-AST retention, or eager Program
  retention.
- Rejected: profiling attributed nearly all benchmark time and hundreds of megabytes to those
  architectural multipliers.

### Raise Node's heap limit

- Pros: one-line operational workaround.
- Cons: retains all Programs and AST wrappers, fails again on larger workspaces, and does nothing
  for latency or recursion.
- Rejected: memory must be bounded by one project, not by available heap.

### Analyze workspace projects concurrently

- Pros: lower wall-clock latency on small projects.
- Cons: the largest Effect project requires gigabytes during semantic analysis; concurrent Programs
  restore the OOM failure.
- Rejected: sequential project lifetime is the required safety invariant.

### Keep arbitrary asynchronous Check streams as a fallback

- Pros: preserves the old public shape.
- Cons: an opaque stream cannot participate in fused dispatch and would create a second execution
  convention.
- Rejected: Check handlers are synchronous AST computations; asynchronous composition remains in
  derivation and reporting.

## Consequences

- Check authors continue to use `nodeCheck`, `fileCheck`, `combineAll`, and `withProgramIndex`; the
  planner representation is internal to those constructors.
- Expensive indexes are built once per current Program snapshot; Ref-backed latest-entry caches
  bound retention to one Program per indexed Check and invalidate on new identity.
- Solution-style one-shot analysis has bounded Program lifetime and no longer OOMs on the vendored
  Effect repository.
- A 20,000-level synthetic AST regression protects stack-safe traversal.
- The benchmark is now a failing performance gate rather than informational output.
- Loaded-workspace callers can still retain multiple Programs deliberately; CLI and multi-project
  benchmark paths use the bounded config interface.
