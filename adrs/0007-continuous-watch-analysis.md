# ADR-0007: Continuous watch analysis

## Status

Accepted

## Date

2026-07-08

## Context

ADR-0006 shipped the batch product — snapshot streams collected once and printed — and left the
daemon direction intentionally undecided, noting only that a watch-mode product should replace the
source streams and keep the function/stream contracts.

That product decision is now made: the tool is the continuously running analyzer. The CLI starts,
prints the initial report, and keeps running; the root-level source signals get real
update-detecting implementations; every downstream signal re-derives per change batch and pushes its
updates through the streams; stdout prints each emitted block as it arrives. No CI or scripted
consumer needs a one-shot mode — stdout is the product and can be captured with `tee`.

## Decision

The CLI is continuous-only. There is no batch flag, no paging, and no file output.

Sources are `ts.createWatchProgram`-backed streams. `programUpdates` bridges a TypeScript watch host
into a `Stream` of fresh `ProgramContext` values — one per rebuild, covering file edits, adds,
deletes, and leaf tsconfig edits. `sourceUpdates` diffs each rebuilt program against the previous
one by `ts.SourceFile` identity (the abstract builder reuses unchanged files, so identity is content
equality there), yielding per-rebuild changed files and removed paths. Directory membership changes
surface through those same diffs; no separate directory stream exists because nothing would consume
it.

The product is a linear pipeline of stream transformers: source updates → workspace-wide change
batches → signal batches → advice/blocks → block deltas. Every element carries one consistent batch
— the ADR-0006 law that anything time-varying travels in the stream, applied at batch level. Change
gates sit between the stages, in pipeline order:

- source — `diffCheckableFiles` on `ts.SourceFile` identity;
- batch — rebuilds that touched nothing checkable are dropped in `workspaceUpdates`;
- signals — `Stream.changesWith(signalsEquivalence)` (detection-set equality per rule, best-effort
  on `Detection.data`);
- report — `blockDeltas` on block key plus rendered text, the canonical content projection.

Rules recompute in full inside each batch, with per-project node-snapshot caching: only the updated
project is re-traversed, and detection sets are always exactly what the snapshot report would
compute for the current programs. Report blocks are keyed (`ReportBlock`: key, text, cleared);
output is per-block deltas — a block re-prints when its content changes, a disappeared block prints
its one `— cleared` line, and a batch with no visible change prints nothing.

The snapshot report path (`loadProject`, `report`, `reportFromWiring`) remains as library and test
surface, re-based on the same batch stages the watch pipeline uses (`workspaceSignals` →
`collectAdvice` → `reportBlocks`). Stdout carries only signals; status lines go to stderr. Exit 0
means the report stream ran (including Ctrl-C); exit 2 means the tool could not start.

## Alternatives Considered

### Keep a `--once` batch flag

- Pros: familiar one-shot mode for scripts.
- Cons: no CI or scripted consumer exists; bounded runs via `timeout` cover self-hosting; a second
  CLI mode doubles the product surface.
- Rejected. If a terminating mode is ever wanted, it is a small flag over `workspaceSignals` +
  `reportBlocks`, not a revival of paging.

### Opt-in `--watch` flag

- Pros: conventional CLI shape.
- Cons: continuous IS the product; a default batch mode would preserve exactly the machinery this
  ADR deletes.
- Rejected.

### Per-file incremental recompute

- Pros: less work per change batch on large repos.
- Cons: wrong under program-indexed rules — checker-using rules observe other files through the type
  graph, so file identity under-approximates their true inputs; correctness would need real
  dependency tracking.
- Rejected until measurements show full per-batch recompute is unusable.

### Independently-ticking per-rule streams with latest-value fan-in

- Pros: per-node update granularity resembling a reactive graph.
- Cons: advice consuming fifty-plus separately-updating streams observes torn half-updated states
  unless propagation is made transactional. Carrying the whole batch in each element gives the same
  per-node gating glitch-free.
- Rejected. Per-node subscriber views stay derivable: broadcast the `SignalsBatch` stream,
  `Stream.map` the projection, gate with `Stream.changesWith`.

### chokidar or platform-FS watching with manual program reload

- Pros: direct control over watch semantics.
- Cons: TypeScript's watch host already coalesces events, tracks config/include changes, and reuses
  unchanged `SourceFile`s.
- Rejected.

### Full-report reprint per change

- Pros: simplest output contract.
- Cons: buries the change; the useful output is the smallest instruction that moves the code, so
  pushing only the changed leaf blocks is the product.
- Rejected in favor of per-block deltas with explicit `— cleared` lines.

## Consequences

- ADR-0006's "daemon direction intentionally undecided" clause is superseded; ADR-0006 otherwise
  stands.
- AGENTS.md self-linting becomes a bounded run (`timeout 10 npm run dev`) whose initial report must
  stay `No signals`.
- The watch e2e tests join the enforcement surface: an fs edit must push the updated block, an fs
  delete must push the block's `— cleared` line, and interrupting the stream must close the
  watchers.
- The change propagation invariant — a node propagates only when its value differs from the previous
  one — is documented on `watchReportFromWiring` in `src/detectors/watch.ts` and in this ADR.
- Mid-run tsconfig breakage is silent: diagnostics are ignored and the watcher keeps the last good
  program. Membership changes in a solution-style root tsconfig's reference list require a restart;
  each leaf project's own tsconfig hot-reloads.
