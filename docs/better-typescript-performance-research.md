# Better TypeScript one-shot performance research

Date: 2026-07-16

Status: all five recommendations implemented and measured on branch `performance-research`.

Scope: source verification of the one-shot path in this isolated worktree against repository code,
ADRs, vendored Effect source, and TypeScript **6.0.3** primary sources, followed by fresh
measurements on the built CLI. Numbers labeled **[MEASURED]** were observed in this worktree;
structural claims labeled **Observed** come from source reads; conclusions that combine both are
**[INFERENCE]**.

## Decision

The dominant one-shot cost is **duplicate TypeScript compiler state and duplicate Better
TypeScript-derived evidence work**, not report rendering, JSON serialization, or process startup.

Exactly five recommendations, ranked by expected end-to-end impact on this repository’s full
one-shot run:

1. **Put one-shot compiler construction behind a deep workspace-program module backed by one shared
   TypeScript `DocumentRegistry`.**
2. **Eliminate `no-unused`’s second Program** by enabling unused locals/parameters on the primary
   Program and filtering the existing diagnostic codes.
3. **Build shared program evidence once per Program identity** for export references, module edges,
   and related architecture facts that several Checks rebuild today.
4. **Make `import-usage` file-linear** by counting every imported binding during one AST walk per
   source file instead of one full walk per binding.
5. **Set JSDoc parsing to `ParseForTypeErrors`** on the compiler/watch host and shared registry.

These are **not additive**. Shared `SourceFile` state and primary-Program unused diagnostics compose
to a measured upper-bound harness; recommendation 4 can become one facet of recommendation 3; JSDoc
savings shrink once ASTs are shared. A sequential/bounded one-shot producer is a **memory and
architecture enabler**, not a top-five wall-clock claim on this repo’s current harness.

## Implementation result **[MEASURED]**

`npm run bench:self` builds once, verifies that the repository config enrolls all **80** Checks,
then times three fresh built-CLI processes. Build time is outside every recorded duration.

| Distribution | Pre-change | Implemented |
| ------------ | ---------: | ----------: |
| Minimum      |   15.457 s |     7.420 s |
| Median       |   16.754 s |     7.464 s |
| Maximum      |   17.388 s |     7.738 s |

The median fell by **55.45%**, from **16.754 s** to **7.464 s**: a **2.24×** throughput improvement.
The implementation benchmark measured wall clock only; the earlier isolated RSS probes remain below
as supporting design evidence, not as a new post-implementation memory claim.

All five changes compose in production: non-watch runs use shared-registry Workspace Programs,
`no-unused` filters primary-Program diagnostics, named architecture evidence is lazy per Program,
`import-usage` walks each file once, and every analysis host uses `ParseForTypeErrors`.

## Evidence table and baseline

### Pre-implementation observed configuration (source)

| Fact                        | Observation                                                                                                                                                              | Source                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| TypeScript version          | Locked/installed **6.0.3** (`^6.0.3` range)                                                                                                                              | `package.json`, `package-lock.json`, `node_modules/typescript/package.json` |
| Solution projects           | Root `tsconfig.json` has **9** project references                                                                                                                        | `tsconfig.json`                                                             |
| Enrolled Checks             | **80** enrolled: **66** under `packages/**` (64 default + 2 functional-core-effect) and **14** architecture-explore under `**/*`                                         | `packages/checks/src/preset/*`, `better-typescript.config.ts`               |
| One-shot entry              | CLI always builds `workspaceUpdates`, then `Stream.take(updates, 1)` when not watching                                                                                   | `packages/cli/src/index.ts`                                                 |
| Watch producer              | One `createWatchProgram` per project; streams merged with **unbounded** concurrency; first `WorkspaceUpdate` waits until **all** projects have a cached `ProgramContext` | `packages/core/src/engine/watch/watch.ts`                                   |
| JSDoc mode                  | Host built with `createWatchCompilerHost` / `createProgram`; **`jsDocParsingMode` never set** (parser default `ParseAll`)                                                | `watch.ts`, `loadProject.ts`; TS 6.0.3 `JSDocParsingMode`                   |
| `no-unused`                 | `withProgramIndex(buildUnusedProgram)` → `ts.createProgram({ rootNames, options, oldProgram })` **without host**; per-file `getSemanticDiagnostics`                      | `packages/checks/src/checks/noUnused.ts`                                    |
| Index cache scope           | `withProgramIndex` is a **per-Check** latest-entry `Ref` keyed by Program identity; cannot dedupe identical builders across Checks                                       | `packages/core/src/engine/check/check.ts`                                   |
| Repeated export/module work | `buildExportReferenceIndex` enrolled **4×**; `buildModuleEdges` **2×**                                                                                                   | architectureExplore checks                                                  |
| Expensive uncached planners | `prefer-effect-schema-class` and `concept-control` plan via `Function.compose(build…, subscriptions)` (no `withProgramIndex`)                                            | `preferEffectSchemaClass.ts`, `conceptControl.ts`                           |
| Comment policy              | Comment Checks use `sourceComments` / `getLeadingCommentRanges` on full text; **no** consumption of TypeScript JSDoc AST nodes found under `packages/checks`             | comment checks + `support/comments.ts`                                      |
| Bounded sequential path     | `workspaceSignalsFromConfigs` → `workspaceSignalsForProjects` uses `Effect.forEach` **default sequential** concurrency                                                   | `loadProject.ts`, `wiring.ts`; Effect `forEach` docs                        |
| ADR tension                 | ADR-0013: one-shot should construct/analyze/release one Program at a time. ADR-0019: one-shot is `Stream.take(updates, 1)` over the watch producer                       | `adrs/0013-…`, `adrs/0019-…`                                                |

### Pre-implementation research measurements **[MEASURED]**

Taken in this isolated worktree on the **built CLI** and temporary harnesses. Prefer these over
older draft numbers.

#### Original full CLI baseline

| Run        |  Wall clock |
| ---------- | ----------: |
| 1          |     19.99 s |
| 2          |     20.10 s |
| 3          |     21.08 s |
| 4          |     16.49 s |
| **Median** | **20.05 s** |

Peak RSS on one timed run: **2.89 GiB** (macOS also reported a **3.64 GB / 3.39 GiB** peak memory
footprint on that run). Config: **80** checks (**66** package + **14** architecture), **9**
projects.

#### Watch-stage control (current producer)

| Metric                                                   | Value                                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `SourceFile` occurrences / unique paths / unique objects | **3,563 / 743 / 3,563**                                                                       |
| Implication                                              | Path overlap is large, but **no object sharing** today: every occurrence is a distinct object |
| Config + discover + program + checks                     | **~15.11–16.51 s**                                                                            |
| RSS after that span                                      | **~3.25–3.37 GiB**                                                                            |

#### Shared `DocumentRegistry` prototype (temporary LanguageServices)

| Metric                      | Value                                                    |
| --------------------------- | -------------------------------------------------------- |
| Detection parity            | **Identical 2,551-row SHA-256 digest** vs paired control |
| Unique `SourceFile` objects | **743** (one per path in the harness)                    |
| Combined program + checks   | **10.41–11.94 s**                                        |
| RSS                         | **2.35–2.38 GiB**                                        |
| Paired reduction            | **~21–31%** wall clock, **~1.0 GiB** RSS                 |

#### `no-unused` exclusion on current path

| Metric                | With `no-unused` |     Without |              Delta |
| --------------------- | ---------------: | ----------: | -----------------: |
| Check stage           |    10.45–12.51 s | 6.77–7.26 s |    **~−3.7–5.3 s** |
| RSS                   |         (paired) |    (paired) | **−0.73–0.95 GiB** |
| Repo detection digest |        preserved |   preserved |          parity OK |

#### Registry + `no-unused` exclusion upper bound

| Metric   | Value                                     |
| -------- | ----------------------------------------- |
| Combined | **6.63 s**                                |
| RSS      | **1.10 GiB**                              |
| Digest   | identical to repo control in that harness |

**[INFERENCE]** ~6.6 s combined is an upper-bound research process (not full CLI with
derive/render), but it shows recommendations 1 and 2 compose without double-counting the same work.

#### JSDoc mode on current watch host (opposite-order pairs, identical digest)

| Mode                 |             Combined |               RSS |
| -------------------- | -------------------: | ----------------: |
| `ParseAll`           |        14.75–15.28 s |     3.34–3.35 GiB |
| `ParseForTypeErrors` |        14.36–14.61 s |     2.99–3.21 GiB |
| Delta                | **only 0.39–0.92 s** | **~0.1–0.35 GiB** |

Smaller than earlier draft claims; still positive and nearly free to ship, but not a multi-second
headline on this path.

#### Sequential `workspaceSignalsFromConfigs` vs one watch sample

| Path                     |  Wall clock |      Max RSS |
| ------------------------ | ----------: | -----------: |
| Sequential config path   | **14.34 s** | **2.46 GiB** |
| One current watch sample | **13.95 s** | **3.33 GiB** |

**Memory win, no reliable time win** on this repo sample. Bounded one-shot is therefore **not**
ranked as a top-five runtime recommendation here; keep it as a memory/architecture enabler and as
part of how a registry-backed loader should dispose Programs.

#### CPU profile and planner evidence **[MEASURED]**

The 0.5 ms CPU profile sampled 16.01 s. Inclusive callsite time includes TypeScript work triggered
under that callsite; it is not automatically removable.

| Bucket / callsite                    |                                            Measurement |
| ------------------------------------ | -----------------------------------------------------: |
| TypeScript self                      |                                              **59.4%** |
| GC                                   |                                              **17.8%** |
| Effect                               |                                              **12.6%** |
| Better TypeScript checks + core self |                                               **4.6%** |
| `no-unused` inclusive                |                                             **3.29 s** |
| Watch creation inclusive             |                                             **3.24 s** |
| `programSymbols.ts` inclusive        | **1.33 s**, including the `import-usage` overlap below |
| `importUsage.ts` inclusive           |                                             **0.60 s** |
| Repeated export-index plans          |                **~1.08 s** under instrumented planning |
| Full architecture fleet exclusion    |                         **~2.52 s** paired upper bound |

Plan instrumentation attributed **2.97 s** to `prefer-effect-schema-class` and **1.62 s** to
`concept-control`, but adjacent exclusion probes did **not** produce a reliable wall-clock
improvement. In particular, excluding schema-class took 15.83–16.13 s combined versus 15.09–15.31 s
controls. **[INFERENCE]** Those plan timings include lazy checker work that warms TypeScript caches
for later Checks; they are attribution, not savings estimates. Re-profile them after recommendations
1–2 rather than optimizing speculative candidate filters now.

**[INFERENCE]** The defensible wall-clock targets are compiler state, the second unused Program, and
demonstrably duplicated/asymptotically repeated evidence work—not fused node dispatch or reporting.

## Implemented one-shot execution path

```text
CLI runCommand
  → loadWiringConfig
  → discoverWorkspace
  → mode boundary
       one-shot → workspacePrograms
                    → one DocumentRegistry for the workspace
                    → one LanguageService per project
                    → shared snapshots and option-bucketed SourceFiles
                    → one WorkspaceUpdate
       watch    → workspaceUpdates
                    → createWatchProgram per project
                    → continuous WorkspaceUpdates
  → reportEvents
       → workspaceSignals      # fused runChecks over all enrolled Checks
       → batchReportBlocks / derive
       → block delta events
```

Relevant code:

- `packages/cli/src/index.ts` selects `workspacePrograms` for one-shot execution and
  `workspaceUpdates` for `--watch`.
- `packages/core/src/engine/watch/workspacePrograms.ts` owns the shared `DocumentRegistry`,
  LanguageService hosts, snapshots, Programs, and scoped disposal.
- `packages/core/src/engine/watch/watch.ts` retains the continuous watch producer.
- `packages/core/src/project/loadProject/analysisCompilerOptions.ts` owns the analysis-only compiler
  option and JSDoc mode policy.
- `packages/core/src/engine/check/check.ts` retains fused kind dispatch; named cross-Check
  architecture evidence now lives in `architectureEvidence.ts`.

Both producers cross the same `WorkspaceUpdate` seam, so report execution, derivation, rendering,
empty reports, and output ordering remain shared. The one-shot path no longer constructs watcher
state whose future-update behavior cannot be used.

## Top five: original ranking and implemented form

### 1. Implemented: deep workspace-program module with shared `SourceFile` objects

**Implementation:** `workspacePrograms` creates one LanguageService per project with one shared
`DocumentRegistry`, exposes only `ProgramContext` through a single `WorkspaceUpdate`, and disposes
every service when downstream stream consumption ends. Keep LanguageService hosts, registry keys,
snapshots, and refcounts inside the module. Do **not** implement a parallel ad hoc `SourceFile`
cache.

**Why this ranks first**

- Observed producer builds **nine** independent watch Programs and retains all contexts
  (`workspaceUpdates`).
- **[MEASURED]** 3,563 occurrences / 743 paths / **3,563 unique objects**—every occurrence has
  distinct identity today.
- **[MEASURED]** temporary shared-registry LanguageService instances produced an **identical
  2,551-row digest**, **743** unique objects, **10.41–11.94 s** program+check time, and **2.35–2.38
  GiB** RSS: **~21–31%** faster and **~1.0 GiB** lower.
- TypeScript documents that `SourceFile` objects dominate language-service memory and that a shared
  registry lets projects share at least `lib.d.ts` when settings allow
  ([`documentRegistry.ts` header](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/services/documentRegistry.ts));
  acquire creates only on bucket miss
  ([acquire path](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/services/documentRegistry.ts)).
- Sharing is **bucketed** by source-file-affecting options
  ([bucket key](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/services/documentRegistry.ts));
  do not promise unconditional single-copy `lib.d.ts` for every project pair.

**Simplification / maintainability / usability**

- Two real behaviors already exist—one snapshot and continuous watch—so two adapters justify the
  seam; callers keep a small workspace-analysis interface.
- TypeScript owns option bucketing and refcounts. Better TypeScript should not duplicate registry
  correctness.
- `ProgramContext` remains the Check-facing interface, so Check and Wiring extensibility is
  unchanged.
- The continuous watch producer remains intact; it shares only the analysis option and JSDoc policy
  required for diagnostic parity.

**Risks / parity**

- Config diagnostics and project-reference behavior under a custom host/LS.
- Invalidation and versioning if reused in watch mode.
- Disposal / refcounts so Programs can release without use-after-free of shared ASTs.
- Heterogeneous source-file-affecting options → multiple correct bucket entries.
- Combine with recommendation 5: construct the registry with the same `JSDocParsingMode` its hosts
  use.

**Primary sources**

- [TypeScript 6.0.3 `DocumentRegistry`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/services/documentRegistry.ts)
- [TypeScript 6.0.3 LanguageService default registry and disposal](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/services/services.ts)
- Repo: `packages/core/src/engine/watch/workspacePrograms.ts`,
  `packages/core/src/engine/watch/watch.ts`

### 2. Implemented: eliminate `no-unused`’s second Program

**Implementation:** every Better TypeScript analysis Program is created with `noUnusedLocals`,
`noUnusedParameters`, and `noEmit` before semantic work. `no-unused` reads the primary Program’s
per-file semantic diagnostics and filters the existing code set
`{6133, 6192, 6196, 6138, 6198, 6199, 6205}`; `buildUnusedProgram` no longer exists.

**Why this ranks second**

- Pre-change: `noUnused.ts` created a second Program with `oldProgram` and **no compiler host**,
  then requested per-file semantic diagnostics.
- TypeScript documents that `oldProgram` can reuse program structure, but a fresh default host still
  supplies new `SourceFile` objects and the new Program always owns a separate lazy checker
  ([`createProgram`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/program.ts)).
- Unused diagnostics are gated on those compiler options in the checker (`unusedIsError` /
  `checkUnusedIdentifiers` in 6.0.3).
- **[MEASURED]** excluding only `no-unused`: check stage **10.45–12.51 s → 6.77–7.26 s**, RSS
  **−0.73–0.95 GiB**, repo digest preserved; profile callsite **~3.29 s**.
- **[MEASURED]** a primary-Program probe on `tests/fixtures/no-unused` returned the same six
  diagnostic code/file/start/length rows as the existing secondary Program.
- Combined with registry: **6.63 s / 1.10 GiB**, identical repo digest—recommendations 1 and 2
  stack.
- Do **not** use `Program.getSuggestionDiagnostics` (`/** @internal */`, absent from public
  `Program`). Unused-as-error via construction-time options matches this Check.

**Simplification / maintainability / usability**

- Removes a second semantic universe that can drift from the primary Program.
- Check body becomes “filter semantic diagnostics,” matching TypeScript’s unused model.
- Public name, messages, hints, and diagnostic-code filter stay stable; fixture parity is the gate.

**Risks / parity**

- Apply options at Program construction for enrolled analysis; do not mutate options after checking
  has begun.
- Preserve underscore-parameter and ambient behavior already encoded upstream.
- If other callers consume raw Program diagnostics, keep analysis options scoped to Better
  TypeScript’s Programs.

**Primary sources**

- [`packages/checks/src/checks/noUnused.ts`](../packages/checks/src/checks/noUnused.ts)
- [TypeScript `createProgram` / `oldProgram`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/program.ts)
- [`noUnusedLocals`](https://www.typescriptlang.org/tsconfig/noUnusedLocals.html) /
  [`noUnusedParameters`](https://www.typescriptlang.org/tsconfig/noUnusedParameters.html)

### 3. Implemented: build shared program evidence once

**Implementation:** the named `architectureEvidence` module exposes two lazy facets:
`exportReferenceIndex(context)` and `moduleEdges(context)`. A `WeakMap` scopes those immutable
results to Program identity, permits superseded Programs to be collected, and avoids a generic
checker-query cache.

**Why this ranks third**

Pre-change duplication TypeScript’s internal checker caches could not remove:

| Work                          | Independent enrollments / pattern                         | Location                                          |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `buildExportReferenceIndex`   | **4** Checks                                              | `programSymbols.ts` + architecture-explore Checks |
| `buildModuleEdges`            | **2** Checks                                              | `moduleGraph`, `passThroughWrappers`              |
| Export-symbol/reference scans | Rewalk project files and resolve symbols                  | `programSymbols.ts`                               |
| FCE indexes                   | Separate `withProgramIndex` builders for boundary + shape | `functionalCoreEffect`                            |

`withProgramIndex` memoizes only within one Check. **[MEASURED]** `programSymbols.ts` held **1.33 s
inclusive** in the CPU profile, repeated export-index plans held **~1.08 s** under instrumentation,
and excluding the full architecture fleet saved **~2.52 s** as an upper bound. The 1.33 s includes
recommendation 4’s 0.60 s, so do not add those numbers.

**Simplification / maintainability / usability**

- One fact owner replaces four independent export-index lifecycles and two module-edge lifecycles.
- Use mutable local maps/lists in the hot implementation, then expose immutable, named projections.
- Checks consume narrow evidence facets rather than a “god index”; new Checks reuse facts without
  learning cache mechanics.
- Preserve enrollment order and file order when projecting detections, so CLI output and
  architecture joins remain stable.

**Risks / parity**

- Invalidate on Program identity change, matching the current `withProgramIndex` rule.
- Keep evidence facets separately owned; do not force unrelated Checks through one opaque schema.
- Hash ordered detection rows and architecture advice after each migrated facet.

**Primary sources**

- [`programSymbols.ts`](../packages/checks/src/checks/architectureExplore/programSymbols.ts)
- [`withProgramIndex`](../packages/core/src/engine/check/check.ts)
- [TypeScript checker caches](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/checker.ts)

### 4. Implemented: make `import-usage` file-linear

**Implementation:** the file-level Check registers each import declaration and local binding, walks
the source file once, updates matching counters, then emits the same one detection per import
declaration in source order.

For a valid file with \(N\) AST nodes and \(B\) uniquely named imported bindings, the implementation
is \(\Theta(N + B)\), replacing the previous \(\Theta(BN)\) behavior.

**Why this ranks fourth**

- Pre-change: `importUsageElement` mapped every binding to `countBinding`, and `countBinding`
  traversed the complete source file.
- **[MEASURED]** the CPU profile attributed **0.60 s inclusive** to `importUsage.ts`; nearly all of
  it overlapped `foldAst` / `astNodesIn`.
- The improvement preserves all 14 architecture Checks. It removes repeated work rather than
  weakening evidence.

**Simplification / maintainability / usability**

- One file pass mirrors the domain statement: “count uses of this file’s imports.”
- Preserve the current intentionally syntactic, name-based behavior—including its documented
  shadowing caveat. Switching to symbol identity would be a product change, not this optimization.
- The collector can become an import facet of recommendation 3, but must be measured once rather
  than credited twice.

**Risks / parity**

- Preserve default, namespace, and named-import call counts.
- Exclude identifiers inside their own import declaration exactly as today.
- Preserve import-declaration and binding order in `ImportUsageData`.

**Primary sources**

- [`importUsage.ts`](../packages/checks/src/checks/architectureExplore/importUsage.ts)
- [`foldAst` / `astNodesIn`](../packages/core/src/engine/sources/sources.ts)

### 5. Implemented: skip unnecessary JSDoc AST parsing

**Implementation:** compiler, watch, and LanguageService hosts use
`ts.JSDocParsingMode.ParseForTypeErrors`; the shared registry receives the same mode.

**Why this ranks fifth**

- Nearly free, low product risk, and aligned with `tsc` 6.0.3:
  [`executeCommandLine.ts`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/executeCommandLine.ts)
  sets `ParseForTypeErrors`; the pre-change repository inherited the parser default `ParseAll`.
- **[MEASURED]** opposite-order pairs on the current watch host saved only **0.39–0.92 s** with
  modest RSS relief—still worthwhile, but not a multi-second claim after recommendation 1.
- Semantics: always parse JSDoc in non-TS files; in `.ts`/`.tsx` parse only `@see` / `@link`
  ([enum](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/types.ts),
  [scanner](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/scanner.ts)).
- Observed Checks scan comment **text**, not JSDoc AST nodes.

**Simplification / maintainability / usability**

- One host field; no Check interface change.
- TypeScript 5.3 notes: less parse time, less comment memory, less GC
  ([release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html#optimizations-by-skipping-jsdoc-parsing)).

**Risks / parity**

- Future Checks needing full JSDoc AST must opt in deliberately.
- Mode must match between the shared registry and every host that uses it.

**Primary sources**

- [TypeScript 5.3 JSDoc parsing optimizations](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html#optimizations-by-skipping-jsdoc-parsing)
- [TypeScript 6.0.3 `JSDocParsingMode`](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/types.ts)
- Repo: `packages/core/src/engine/watch/watch.ts`, comment Checks under `packages/checks/src/checks`

## Implementation and verification

The implementation follows the dependency order the research identified:

1. Central analysis options and `ParseForTypeErrors`.
2. Shared-registry `workspacePrograms` at the existing mode boundary.
3. Primary-Program unused diagnostics.
4. File-linear import usage.
5. Named, lazy architecture evidence facets.

Focused contracts cover fresh-process benchmark enrollment and summaries, one-shot versus watch CLI
lifecycle, shared `SourceFile` identity for compatible registry buckets, primary unused-diagnostic
parity, JSDoc mode, evidence reuse/invalidation by Program identity, detection ordering, and
default, named, aliased, and namespace import counts.

The reproducible whole-process command is:

```sh
npm run bench:self
```

## Interactions and non-additivity

| Pair                | Interaction                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1 + 2               | **[MEASURED]** compose to **6.63 s / 1.10 GiB** upper bound with identical digest.                                                   |
| 1 + 5               | Shared trees parse once; residual JSDoc savings shrink, so set the mode at registry construction.                                    |
| 1 + lifetime policy | LanguageServices live through one report stream, then dispose together; the registry removes duplicate compatible ASTs while active. |
| 3 + 4               | Import usage can be an evidence facet; measure it once and never add overlapping CPU samples.                                        |
| All + render        | Reporting remains secondary once compiler and evidence work dominate.                                                                |

## What not to prioritize first (rejected alternatives)

- **Bounded one-shot producer as a standalone runtime win:** **[MEASURED]** sequential
  `workspaceSignalsFromConfigs` was **14.34 s / 2.46 GiB** vs watch sample **13.95 s / 3.33
  GiB**—clear RSS, no reliable time win.
- **Blind schema-class/concept-control rewrites:** inclusive plan attribution was high, but
  exclusion did not improve wall clock reliably. Candidate narrowing also risks missed detections.
  Re-profile after recommendations 1–2 before changing their algorithms.
- **Rendering and JSON first:** not where CPU samples or stage time concentrate.
- **Standalone AST-stack rewrite:** `foldAst` / `astNodesIn` already use an explicit stack. Fix the
  measured repeated caller in recommendation 4 instead.
- **Generic checker memoization:** TypeScript already caches node links, expression types, and
  signatures. Cache Better TypeScript-derived facts instead.
- **Worker threads for Programs:** Programs are not transferable and rebuilding them multiplies
  memory. ADR-0013 rejected concurrent Program analysis after OOM evidence.
- **`.tsbuildinfo` alone:** custom scans still run fully without a Check-evidence invalidation
  model.
- **`Program.getSuggestionDiagnostics` for unused:** internal; use compiler options instead.
- **Ad hoc global `SourceFile` map:** recreates TypeScript’s option bucketing and refcount bugs. Use
  `DocumentRegistry`.
- **Dropping the architecture fleet for speed:** violates the usability constraint. Optimize its
  evidence without removing Checks.

## Risks and parity checklist

- Freeze a workspace snapshot; hash ordered detection rows (path, line, column, check name, message)
  before/after each change.
- Include JavaScript files, project references, and projects with differing `module`/`target`
  settings.
- Watch mode: no regression in update batching, quiet rebuilds, or disposal (`watch.close`).
- Memory: max RSS and whether shared caches leak across sequential projects.
- Vendored Effect workspace: sequential Program lifetime must still avoid OOM (ADR-0013).
- Public CLI output (NDJSON / pretty blocks) and silent architecture evidence joins.
- Re-run full CLI medians after each stacked change; do not sum the independent deltas.

## Claim labels

| Label           | Meaning                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **Observed**    | Read from this worktree’s source, lockfile, vendored Effect source, or installed TypeScript 6.0.3. |
| **[MEASURED]**  | Timing, RSS, digest, or profile observed in temporary harnesses in this worktree.                  |
| **[INFERENCE]** | Conclusion from observed structure + measurements; not a production guarantee.                     |

## Profiling references

- [Node `--cpu-prof`](https://nodejs.org/download/release/v22.17.1/docs/api/cli.html#--cpu-prof)
- [Node `--heap-prof`](https://nodejs.org/download/release/v22.17.1/docs/api/cli.html#--heap-prof)
- [V8 sampling profiler](https://v8.dev/docs/profile)
- [TypeScript performance tracing](https://github.com/microsoft/TypeScript/wiki/Performance#performance-tracing)

## Outcome

The five recommendations are implemented in this isolated worktree. Production code, regression
tests, the self-host benchmark, README, and architecture decisions now record the cutover.
