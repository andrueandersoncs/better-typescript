# ADR-0022: Shared one-shot compiler state and program evidence

## Status

Accepted. [ADR-0023](0023-one-shot-effects-and-rerun-watch.md) supersedes the stream-scoped
workspace producer lifetime and mode-specific producer decision; shared one-shot compiler state and
evidence decisions remain accepted.

## Date

2026-07-16

## Context

The repository's full one-shot run enrolled 80 Checks across nine TypeScript projects. A repeatable
fresh-process benchmark measured a 16.754 s pre-change median after build time was excluded.
Profiling and parity probes identified five overlapping sources of avoidable work:

- one-shot execution constructed the continuous watch producer and retained nine independent
  TypeScript compiler graphs;
- `no-unused` constructed a second Program solely to enable unused diagnostics;
- architecture Checks rebuilt the same export-reference and module-edge evidence independently;
- `import-usage` walked a complete SourceFile once per imported binding; and
- analysis hosts inherited TypeScript's full JSDoc parsing mode.

The useful boundary remained ADR-0019's `Stream<WorkspaceUpdate>` input to reporting. Checks and
Wiring did not need compiler lifecycle, cache, or mode details.

## Decision

### Benchmark the real one-shot process

`npm run bench:self` builds once, verifies that the repository config enrolls all current Checks,
then measures three fresh built-CLI processes. Timed durations exclude the build. The minimum,
median, and maximum form the regression evidence; the fixture microbenchmark remains the separate
sub-100 ms execution gate.

### Use mode-specific producers at one Workspace Update seam

The CLI selects the producer before calling `reportEvents`:

- `workspacePrograms(workspace)` serves one-shot execution; and
- `workspaceUpdates(workspace, watchOptions)` remains the continuous watch producer.

`workspacePrograms` is one deep resource-owning module. Each stream subscription creates one
TypeScript `DocumentRegistry` for the workspace, one LanguageService per project, and one shared
ScriptSnapshot map. TypeScript's registry owns source-file-affecting option buckets and shares
compatible `SourceFile` objects across Programs. The module emits one ordered `WorkspaceUpdate` and
keeps every LanguageService alive until downstream stream consumption ends; an Effect finalizer then
disposes all services together.

The old `loadProjectConfig` and `contextFromLoadedProject` construction helpers are private. Public
callers use `loadProject` for loaded workspaces, `runCheckOnProject` for one-Check execution, or the
workspace producer for complete reports. This keeps compiler lifecycle decisions behind the
load/project boundary instead of exposing a second construction path.

The watch producer keeps its invalidation, batching, recovery, and close behavior. Both producers
share reporting, glob activation, fused Check dispatch, derivation, rendering, empty-report, and
output-order semantics after the Workspace Update boundary.

This supersedes ADR-0019's single-producer `Stream.take(..., 1)` implementation choice and
ADR-0013's one-Program-at-a-time CLI one-shot lifetime. The bounded config-native API remains for
callers that explicitly choose sequential project analysis.

### Construct analysis Programs with one diagnostic policy

All Better TypeScript analysis Programs receive `noEmit`, `noUnusedLocals`, and `noUnusedParameters`
before semantic work. `no-unused` filters the primary Program's per-file semantic diagnostics with
its existing code set; it no longer constructs or caches a second Program.

Compiler, watch, and LanguageService hosts use `JSDocParsingMode.ParseForTypeErrors`. The shared
DocumentRegistry receives the same mode, so a registry bucket never mixes incompatible parsing
policies.

### Share only named Better TypeScript evidence

The Architecture Explore package owns a small `architectureEvidence` module with two lazy accessors:
export references and module edges. A `WeakMap` binds each immutable facet to Program identity, so
all requesting Checks reuse it, a new Program invalidates it, and superseded Programs remain
collectible. This is not a generic checker-query cache and does not change TypeScript's own caches.

`import-usage` is a file-level Check. It registers imports and bindings, traverses the SourceFile
once, updates name and call counters, then emits detections in import order. Its intentionally
syntactic shadowing behavior, data, messages, and hints remain unchanged.

## Alternatives Considered

### Keep one-shot on the watch producer

- Pros: one compiler producer.
- Cons: allocates watcher and incremental state that a terminating process cannot use and prevents
  registry sharing across project Programs.
- Rejected: sharing the Workspace Update output is the deep seam; producer lifecycle is genuinely
  mode-specific.

### Keep the second unused Program

- Pros: no analysis compiler-option policy.
- Cons: duplicates SourceFiles and a lazy checker and can diverge from the Program every other Check
  observes.
- Rejected: construction-time options make the primary Program authoritative and simpler.

### Add a generic global evidence cache

- Pros: arbitrary Check queries could memoize.
- Cons: hides ownership, dependencies, invalidation, and retention behind an unbounded abstraction.
- Rejected: only measured duplicate domain facts receive named Program-scoped facets.

### Analyze Programs in worker threads

- Pros: potential CPU parallelism.
- Cons: TypeScript Programs are not transferable; rebuilding them in workers multiplies dominant
  memory and semantic work.
- Rejected: remove duplicate compiler state before adding concurrency.

## Consequences

- The same 80-Check fresh-process benchmark moved from 15.457/16.754/17.388 s to 7.420/7.464/7.738
  s. Median latency fell **55.45%**, from **16.754 s** to **7.464 s**, a **2.24×** throughput
  improvement.
- One-shot and watch now have explicit producer names while retaining one report composition.
- Checks still receive only `ProgramContext`; Check and Wiring extensibility are unchanged.
- Compatible projects share registry-owned SourceFiles; TypeScript correctly keeps separate buckets
  for source-file-affecting compiler options.
- LanguageService disposal is part of stream lifetime rather than caller discipline.
- Unused diagnostics have one semantic source of truth.
- Cross-Check evidence reuse is explicit, lazy, named, and bounded by weak Program identity.
- Import-usage complexity falls from one full walk per binding to one full walk per file.
- Future Checks that require complete JSDoc ASTs must change the analysis parsing policy
  deliberately.
