# Better TypeScript one-shot performance research

Date: 2026-07-16

Status: research only. No production implementation was changed.

## Decision

The largest opportunity is not report rendering or process startup. It is duplicate compiler state
and duplicate semantic work across the nine TypeScript projects.

The top five recommendations, ranked by expected impact on this repository's full one-shot run, are:

1. share TypeScript `SourceFile` objects across project Programs with one `DocumentRegistry`;
2. make `no-unused` use the primary Program instead of constructing a second Program;
3. set the compiler host's JSDoc mode to `ParseForTypeErrors`;
4. build shared program evidence once instead of rebuilding the same indexes per Check; and
5. give one-shot execution a non-watching, bounded project producer.

The measured effects below are not additive. In particular, shared `SourceFile` state absorbs much
of the separate JSDoc win.

## Scope and baseline

The representative command was the built CLI against this repository, with the checked-in
`better-typescript.config.ts`: 67 reported/package checks plus 14 architecture checks, across nine
referenced projects.

Four unprofiled runs took 16.56 s, 16.71 s, 16.74 s, and 17.16 s. Median: **16.72 s**. One timed run
reached **3.18 GiB maximum RSS** and emitted about 107 KiB of NDJSON.

A stage harness over the same public engine interfaces measured:

| Stage                                     | Elapsed | RSS after stage |
| ----------------------------------------- | ------: | --------------: |
| Config load                               |   22 ms |         181 MiB |
| Workspace discovery                       |   12 ms |         183 MiB |
| First complete watched snapshot           |  3.41 s |       1,740 MiB |
| All 81 configured checks                  | 12.03 s |       3,233 MiB |
| Derivation and block rendering            |  424 ms |       3,233 MiB |
| Event construction and JSON serialization | 0.17 ms |       3,233 MiB |

The workspace Programs contained 3,566 `SourceFile` occurrences but only 746 unique paths. **2,820
occurrences (79.1%) were duplicates across Programs**; 339 paths appeared in all nine Programs.

A 0.5 ms Node CPU profile sampled 18.54 s under profiler overhead:

- garbage collection: 4.65 s, or 25.1% of samples;
- `runChecks`: 9.86 s inclusive;
- initial `createWatchProgram`: 3.04 s inclusive;
- check planning/index construction: 5.36 s inclusive;
- file subscriptions: 3.09 s inclusive; and
- fused node traversal and handlers: 1.40 s inclusive.

A sampling heap profile attributed 120 MiB of retained sampled allocation to `no-unused`'s second
Program and 318 MiB below initial watch-Program creation. TypeScript parser, binder, symbol, and AST
allocations dominated the retained profile.

The working tree was actively changing during this research. Absolute detection counts changed
between early and late snapshots. Every semantic comparison reported below was therefore paired on
one snapshot and required an identical SHA-256 hash of ordered detection rows. Re-run the baseline
before implementation.

## Top five

### 1. Share `SourceFile` objects across project Programs

**Recommendation:** prototype the one-shot project provider with one TypeScript `DocumentRegistry`
shared by semantic `LanguageService` instances. Do not build an ad hoc cache of `SourceFile`
objects.

TypeScript documents `DocumentRegistry` specifically as a way for multiple language services to
share ASTs. Its source notes that `SourceFile` objects account for most language-service memory and
that sharing a registry lets projects share at least `lib.d.ts`.

This directly targets the measured 79.1% duplicate `SourceFile` occurrences. A research-only
prototype produced the same 2,841 ordered detection rows and the same hash as its paired watch-based
control:

| Program provider, `ParseAll` | Program creation |  Checks | Combined | RSS after checks |
| ---------------------------- | ---------------: | ------: | -------: | ---------------: |
| Current watch Programs       |           3.74 s | 14.16 s |  17.91 s |        3,305 MiB |
| Shared `DocumentRegistry`    |           0.80 s |  9.79 s |  10.59 s |        2,286 MiB |

That paired harness showed **41% less program-plus-check time** and about **1.0 GiB less RSS**. The
control harness is slower than the ordinary CLI, so 41% is not a promised end-to-end percentage.
[INFERENCE] Adding the currently measured 424 ms derivation stage to the shared-registry process
suggests an approximately 11.4 s full run, around 32% below the 16.72 s median.

Risks to validate before adopting it:

- exact config diagnostics and project-reference behavior;
- file-version and invalidation behavior if the provider is later used for watch mode;
- disposal and registry reference counts; and
- parity on JavaScript projects and projects with different source-file-affecting compiler options.

Primary source:
[TypeScript 6.0.3 `DocumentRegistry`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/services/documentRegistry.ts).

### 2. Eliminate `no-unused`'s second Program

**Recommendation:** when `no-unused` is enrolled, extend the primary Program's options with
`noUnusedLocals`, `noUnusedParameters`, and `noEmit`, then filter unused diagnostics from that same
Program.

Today, `buildUnusedProgram` calls `ts.createProgram` with `oldProgram: context.program`, then each
file handler requests semantic diagnostics from the new Program. TypeScript states that `oldProgram`
reuses program structure; the new Program still lazily creates its own checker.

Measured evidence:

- excluding only `no-unused` reduced the check stage from 11.96 s to 7.60 s: **4.36 s, or 36%**;
- RSS after checks fell from 3,287 MiB to 2,530 MiB: **758 MiB**;
- its CPU subtree contained 686 ms in `buildUnusedProgram` and 2.73 s in semantic-diagnostic file
  handlers, before separately sampled GC; and
- its second Program retained 120 MiB in the sampling heap profile.

A primary-Program diagnostic probe produced exactly the same six file/line/column locations as the
existing check on `tests/fixtures/no-unused`.

Combined with recommendation 1, a research process using a shared registry and primary-Program
unused diagnostics took **7.14 s** and peaked at **1.05 GiB maximum RSS**, with the same ordered
2,841-detection hash as the paired current-semantics run. It omitted the 424 ms derive/render stage.
[INFERENCE] This establishes a credible path to a full run near 7.6 s, not a production benchmark.

Do not switch to `Program.getSuggestionDiagnostics`; upstream marks that API internal. Preserve the
existing diagnostic-code filter and fixture parity.

Sources:

- [`noUnused.ts`](../packages/checks/src/checks/noUnused.ts)
- [TypeScript `createProgram` and `oldProgram`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/program.ts#L1499-L1518)
- [TypeScript checker creation](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/program.ts#L2684-L2686)
- [`noUnusedLocals`](https://www.typescriptlang.org/tsconfig/noUnusedLocals.html)
- [`noUnusedParameters`](https://www.typescriptlang.org/tsconfig/noUnusedParameters.html)

### 3. Skip unnecessary JSDoc AST parsing

**Recommendation:** set `WatchCompilerHost.jsDocParsingMode` to
`ts.JSDocParsingMode.ParseForTypeErrors`.

The current checks reject JSDoc text through comment scanning but do not consume TypeScript JSDoc
AST nodes. `ParseForTypeErrors` preserves JSDoc needed for correct type errors, including required
JavaScript-file behavior.

Two paired, opposite-order experiments produced identical ordered detection hashes:

| Mode                 | Snapshot plus checks | Difference from `ParseAll` |
| -------------------- | -------------------: | -------------------------: |
| `ParseAll`           |        17.91–18.59 s |                   baseline |
| `ParseForTypeErrors` |        15.17–15.22 s |     **2.69–3.43 s faster** |

TypeScript's own release notes say skipping JSDoc parsing reduces parsing time, memory used to store
comments, and garbage-collection time, and expose `JSDocParsingMode` for tools to obtain the same
benefit.

This recommendation overlaps strongly with recommendation 1. With shared source files, `ParseAll`
and `ParseForTypeErrors` differed by only about 0.14 s in the prototype because duplicated
dependency AST parsing had already been removed. Treat this as the fastest current-path win, not an
additional three seconds after adopting a registry.

Sources:

- [TypeScript 5.3: Optimizations by Skipping JSDoc Parsing](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html#optimizations-by-skipping-jsdoc-parsing)
- [TypeScript 6.0.3 `JSDocParsingMode`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/types.ts)

### 4. Build shared program evidence once

**Recommendation:** introduce a Program-identity-bounded evidence provider that builds common facts
once, then lets Checks project their subscriptions and detections from those facts. Keep it owned by
the analysis run; do not use module-global mutable state or a generic checker-query cache.

The first snapshot currently repeats higher-level work that TypeScript's checker cache cannot
remove:

- `buildExportReferenceIndex` performs a whole-project identifier/symbol scan and is independently
  called by `compositionFingerprints`, `compositionForwarders`, `testOnlyExports`, and
  `passThroughWrappers`;
- `buildModuleEdges` is built for both `moduleGraph` and `passThroughWrappers`;
- `importUsage` scans the entire importing file once per imported binding;
- `preferEffectSchemaClass` performs another whole-program object-literal/type scan; and
- `conceptControl` builds several overlapping project-wide declaration/function indexes.

`withProgramIndex` caches per Check, so it cannot deduplicate identical first-snapshot builds across
Checks. The CPU profile placed 5.36 s under planning. Excluding the 14-check architecture fleet
reduced the check stage by 2.51 s and RSS by 207 MiB; that is an upper bound, not the expected
shared- index win. Individual repeated export scans sampled at roughly 0.27–0.33 s each, and
`importUsage` sampled around 0.60 s.

The shared evidence pass should collect, in one source-ordered walk where possible:

- imports and binding-use counts;
- exported symbols/functions and their references;
- module edges and test/production paths; and
- common declaration/function metadata used by architecture and concept checks.

Use mutable local maps/lists in this internal hot kernel, then construct immutable public evidence
at the boundary. Preserve file-major and Check-major detection order. TypeScript already caches raw
node/symbol/type work internally, so wrapping every checker call in another cache is unlikely to
pay; cache the expensive Better TypeScript-derived facts instead.

Sources:

- [`programSymbols.ts`](../packages/checks/src/checks/architectureExplore/programSymbols.ts)
- [`importUsage.ts`](../packages/checks/src/checks/architectureExplore/importUsage.ts)
- [`withProgramIndex`](../packages/core/src/engine/check/check.ts)
- [TypeScript checker link caches](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/checker.ts#L2934-L2942)

### 5. Use a non-watching, bounded one-shot producer

**Recommendation:** stop constructing nine watch Programs merely to take the first
`WorkspaceUpdate`. One-shot should load, analyze, aggregate signals, and release one project at a
time. Watch mode should retain the existing continuous producer.

The CLI currently calls `workspaceUpdates` in both modes and implements one-shot as
`Stream.take(updates, 1)`. `workspaceUpdates` merges nine project streams with unbounded
concurrency, retains every `ProgramContext`, and emits only after all have arrived. This contradicts
ADR-0013's stated one-project lifetime even though ADR-0019 intentionally unified the producer.

The existing config-native bounded path was tested without production changes. On the same early
snapshot it produced the same 2,911 detections and 20 blocks:

| Path                                                       | Whole process | Maximum RSS |
| ---------------------------------------------------------- | ------------: | ----------: |
| Current CLI                                                |       16.56 s |    3.18 GiB |
| Bounded `workspaceSignalsFromConfigs` path plus derivation |       14.61 s |    2.57 GiB |

Observed improvement: **1.95 s (12%)** and **0.60 GiB (19%)**.

This needs an architecture decision, not a local branch in the CLI. The report seam currently
accepts complete context snapshots; a genuinely bounded one-shot cannot construct that array.
Preserve one reporting implementation by moving the common seam after signal aggregation, rather
than duplicating derivation, rendering, or event semantics.

This also trades against recommendation 1: a registry gains speed by retaining shared language-
service state, while strict sequential loading minimizes live Programs. Measure both on the vendored
Effect workspace before choosing one universal policy; a bounded batch or size-aware strategy may be
necessary.

Sources:

- [`runCommand`](../packages/cli/src/index.ts)
- [`workspaceUpdates`](../packages/core/src/engine/watch/watch.ts)
- [`workspaceSignalsFromConfigs`](../packages/core/src/project/loadProject/loadProject.ts)
- [ADR-0013](../adrs/0013-fused-dispatch-and-bounded-workspaces.md)
- [ADR-0019](../adrs/0019-workspace-update-report-seam.md)
- [TypeScript watch implementation](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/watchPublic.ts#L420-L505)

## What not to prioritize first

- **Rendering and JSON:** 424 ms for derive/render and 0.17 ms for event construction/serialization.
- **A standalone AST-stack rewrite:** a stack-safe mutable traversal was 3.1 times faster than the
  current persistent frontier over 166,498 nodes, but the median changed only from 38.8 ms to 12.3
  ms per complete traversal. Fold it into recommendation 4; it is not a top-level multi-second win.
- **Generic checker memoization:** TypeScript already caches node links, expression types, and
  resolved signatures. Share Better TypeScript's derived indexes instead.
- **Worker threads:** Programs and checkers are not transferable, and rebuilding them in workers
  would multiply the dominant memory cost. ADR-0013 already rejected concurrent Program analysis
  after OOM evidence.
- **Incremental builder flavor alone:** Better TypeScript still performs full custom scans and
  indexes; `.tsbuildinfo` cannot make those checks incremental without a dependency/invalidation
  model.

## Profiling sources

- [Node `--cpu-prof`](https://nodejs.org/download/release/v22.17.1/docs/api/cli.html#--cpu-prof)
- [Node `--heap-prof`](https://nodejs.org/download/release/v22.17.1/docs/api/cli.html#--heap-prof)
- [V8 sampling profiler](https://v8.dev/docs/profile)
- [V8 young-generation collection](https://v8.dev/blog/orinoco-parallel-scavenger)
- [TypeScript performance tracing](https://github.com/microsoft/TypeScript/wiki/Performance#performance-tracing)
