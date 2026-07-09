# Simplification Plan — explicit fleets over internal machinery

## Status

**Proposed.** This is the implementation plan derived from the `src/` simplification review.

It refines `extensibility-plan.md`; it does not replace its settled product constraints. Where the two documents conflict, this plan controls only these refinements:

1. The kernel and preset must be physically separated so kernel imports do not evaluate the built-in fleet.
2. Detection deduplication must preserve distinct custom detections at one location.
3. The public fallback-advice helper must not require callers to run one advice stream twice.

When implementation begins, fold these refinements back into `extensibility-plan.md` and record the final decision in ADR-0009. Do not leave two normative documents with unresolved differences.

## Goal

Make the implementation as small and direct as possible while opening the product to explicit user-authored `ReportWiring` fleets.

The end state preserves the existing ontology:

```text
rule:    Stream<AstNodeElement> → Stream<Detection>
helper:  named rule signal that feeds advice only
advice:  (rule signals, helper signals) → Stream<AdviceElement>
wiring:  { rules, helpers, advice }
report:  explicit application of wiring to a snapshot or watch stream
```

The intended product model remains:

```text
better-typescript.config.ts
  → load and validate one ReportWiring
  → watchReportFromWiring(wiring)
  → stable NDJSON events
```

Rules see the program. Advice sees signals. Composition is TypeScript code.

## Baseline

The bounded self-host run completed with no detections:

```text
$ timeout 10 npm run dev
Watching /Users/andrueanderson/Workspace/better-typescript for changes.
No signals in /Users/andrueanderson/Workspace/better-typescript.
```

The command exited with `124` only because `timeout` terminated the intentional watch process after ten seconds.

Existing tests already prove the core injection seam:

- `tests/report.test.ts` wires custom reported and helper checks into `reportFromWiring`.
- `tests/watch.test.ts` wires a custom probe into `watchReportFromWiring`.

## Constraints

All constraints in `extensibility-plan.md` remain in force.

### Must preserve

1. No registry, detector ID, matcher language, role, severity, suppression, generated style guide, or dynamic plugin discovery.
2. One explicit TypeScript config module: `better-typescript.config.ts`.
3. Watch-only CLI; snapshot reporting remains a library/test surface.
4. NDJSON default output and `--pretty` output semantics.
5. Deterministic report ordering: advice blocks first, then reported rule blocks in wiring order.
6. Absent config falls back to the current preset.
7. Duplicate names are rejected within `rules` and within `helpers`; cross-array name reuse remains allowed.
8. Missing advice signal lookups remain `Stream.empty`.
9. Full rule recomputation per consistent workspace batch. Do not add per-file incremental rule execution.
10. This repository continues to self-host with `No signals`.

### Must not use simplification as an excuse to remove useful seams

Keep:

- `ReportWiring` with explicit `rules`, `helpers`, and `advice` arrays/functions.
- `nodeCheck`, `fileCheck`, `nodeSubscriptions`, `fileSubscriptions`, `combineAll`, `withProgramIndex`, and `checkFromSubscriptions`.
- `withProgramIndex`: program-wide rules rely on it to avoid rebuilding indexes per source file.
- `AstNodeElement` as the public rule input. Do not replace it with file batches.
- The linear watch pipeline:

  ```text
  workspaceUpdates
    → signalUpdates
    → Stream.changesWith(signalsEquivalence)
    → adviceUpdates
    → blockDeltas
  ```

- Keyed report blocks and NDJSON event identities.
- One rule per preset module. Do not introduce a small syntax-matcher DSL merely to save a few lines.

## Current execution model

```text
CLI
  → discoverWorkspace(--project)
  → watchReport(defaultWiring)

watchReportFromWiring(wiring)
  → workspaceUpdates
  → recompute every wired rule/helper over consistent AST snapshots
  → materialize named rule snapshots
  → run advice against replayable signal streams
  → build keyed report blocks
  → emit initial blocks and later deltas as NDJSON events
```

The core model is already direct. Most simplification comes from deleting duplicated paths and preventing implementation details from becoming public API.

---

## Decisions

## 1. Make the kernel/preset split physically real

### Problem

`src/detectors/report.ts` currently defines both report execution and the full built-in fleet. It imports every built-in rule and advice derivation, constructs `reportedRules`, `helperRules`, `defaultAdvice`, and `defaultWiring`, and exports the snapshot default alias. `src/detectors/watch.ts` imports `defaultWiring` only to export `watchReport`.

A Node consumer importing a kernel symbol re-exported from that module would evaluate the preset fleet unnecessarily. This undermines the product boundary described by `extensibility-plan.md`.

### Decision

Keep one report implementation, but move default composition out of the engine:

```text
src/
  kernel.ts                     public kernel barrel
  preset.ts                     public preset barrel
  detectors/
    report.ts                   report engine; no preset imports
    watch.ts                    watch engine; no default alias
  preset/
    defaultWiring.ts            reported rules, helper rules, default advice
```

`src/kernel.ts` may re-export engine symbols. It must not import a module that imports the preset.

`src/preset.ts` exports:

- `rules` namespace or named rule exports,
- `advice` namespace or named advice exports,
- `preferCurriedDataLastFunctions` as the helper rule,
- `reportedRules`, `helperRules`, `defaultAdvice`, and `defaultWiring`,
- optional convenience aliases:

  ```ts
  export const report = reportFromWiring(defaultWiring)
  export const watchReport = watchReportFromWiring(defaultWiring)
  ```

The CLI deliberately imports the preset only to obtain the zero-config default.

### Consequences

- `better-typescript` becomes usable without loading built-ins.
- `better-typescript/preset` remains the one import for users who want the reference fleet.
- No second wiring implementation or runner path is introduced.

## 2. Preserve all semantically distinct detections during deduplication

### Problem

`dedupedRuleSnapshot` currently deduplicates with only:

```text
path : line : column
```

A single custom rule can legally emit two detections at the same node with different messages, hints, or advice data. The current reduction silently drops every detection after the first at that location.

This conflicts with the report renderer, which intentionally groups one rule by distinct message/hint pairs.

### Decision

Define and test a complete deduplication policy before publishing user rules.

The deduplication identity must include at least:

```text
location.path
location.line
location.column
message
hint
```

Decide explicitly whether `Detection.data` participates. It is advice-visible, so omitting it can erase semantically distinct evidence. The implementation must remain deterministic and must retain the existing behavior that collapses duplicate emissions from the same physical location across duplicated workspace projects.

### Required test

A custom `RuleCheck` emits two distinct detections at one AST node. Both must reach:

1. rule report blocks, and
2. advice input signals.

## 3. Publish wiring as a structural authoring contract, not a constructor protocol

### Decision

Public authoring is type-and-factory based:

```ts
namedRuleCheck(name, check)
makeWiring({ rules, helpers, advice })
ruleSignal(signals)(name)
```

`makeWiring` is the one duplicate-name validator:

- reject duplicate names within `rules`,
- reject duplicate names within `helpers`,
- allow the same name in both arrays,
- retain silent `Stream.empty` for missing advice lookups.

Treat `RuleSignals`, `NamedRuleCheck`, and `ReportWiring` as public structural concepts. Do not require config authors to instantiate a runtime class.

Internal `Data.Class` values may remain private where they uphold the repository’s class-as-data convention. Do not flatten all runtime models to object literals as a mechanical cleanup.

### Why not flatten every class

Effect `Schema.Class` constructors validate input by default. The vendored Effect implementation calls `ParseResult.validateSync(constructorSchema)` during construction. The source rules also intentionally distinguish schema-backed data from opaque runtime values such as streams, functions, and TypeScript compiler objects.

Therefore:

- retain schema-backed domain and wire values where validation matters: `Location`, `Detection`, `AdviceElement`, report keys, report events;
- use `Data.Class` internally where opaque values genuinely need class/value semantics;
- hide constructors and internal batch models from package exports;
- only replace schema wrappers after confirming there is no required validation boundary.

## 3.5. Model higher-level checks as terminal advice derivations

### Decision

A rule does **not** consume another rule. A `RuleCheck` remains a function from the program’s `AstNodeElement` stream to a `Detection` stream. This one-way boundary is intentional:

```text
AST/program
  → low-level reported rules and helper rules
  → named rule/helper signals
  → higher-level advice derivations
  → AdviceElement report blocks
```

A higher-level diagnosis that consumes lower-level observations is an advice derivation. It receives `RuleSignals` and helper signals from `ReportWiring.advice`, selects its inputs with `ruleSignal`, and returns `Stream<AdviceElement>`. Advice may also consume other advice streams directly when the diagnosis is genuinely second-order.

The preset already demonstrates both forms:

- `imperativeStateManager` consumes `no-mutation`, `prefer-hash-map`, `prefer-hash-set`, `no-mutable-array-methods`, and `no-mutable-variable-declarations`;
- `pipelineHostile` consumes `no-nested-calls` plus the `prefer-curried-data-last-functions` helper;
- `sideEffectLaundering`, `highSignalDensity`, `hotSubsystem`, and `ruleDominance` consume the named lower-level detection stream;
- `systemicHotspots` consumes the `hotSubsystem` and filtered high-signal-density advice streams.

### Classification rule

| Need | Model it as | Why |
| --- | --- | --- |
| A direct source-level observation that should render as a rule leaf | Reported rule | It independently transforms AST nodes into detections. |
| A source-level observation used only as evidence for other analysis | Helper rule | It runs with rules but produces no direct rule leaf. |
| A diagnosis, campaign recommendation, correlation, density assessment, or aggregate that consumes observations | Advice derivation | It consumes signals and emits an `AdviceElement` with explicit evidence. |
| A diagnosis built from other diagnoses | Advice derivation over advice streams | Ordinary stream composition is sufficient; `systemicHotspots` is the reference pattern. |

### Consequences

1. Do not add a rule-to-rule dependency API, dependency declarations, a topological scheduler, or a detector graph. That would revive architecture the product deliberately retired.
2. Rules remain independently executable and only see the current program. This keeps the rule authoring contract small and cycle-free.
3. Helpers are the reusable lower-level signal mechanism when a check should not create a user-facing rule leaf.
4. Advice is the terminal, higher-level layer. It may combine rules, helpers, and other locally-composed advice streams using ordinary Effect `Stream` operations.
5. User configs express this wiring explicitly. Missing prose-name lookups remain `Stream.empty`; present/absent checks are the configuration mechanism.
6. Deterministic output still comes from explicit wiring/output order and the existing report block ordering. No scheduler is needed.

### Required examples and tests

1. The documentation must show a custom advice derivation consuming a preset rule via `ruleSignal(ruleSignals)("no-mutation")`.
2. Keep an example of a custom helper rule feeding advice without creating a rule leaf.
3. Keep the `systemicHotspots`-style second-order advice test: advice based on both a directory-level and file-level lower diagnosis.
4. Add no API that lets a `RuleCheck` receive `RuleSignals`; this is a deliberate compile-time boundary.

## 4. Make fallback advice safe for ordinary user streams

### Problem

The current default graph passes `specificAdvice` both to `filterFallbackAdvice` and to the final output stream. `filterFallbackAdvice` first collects the whole specific stream.

The current preset streams are replayable and pure by construction. A public helper must not require every user-authored advice stream to share that property.

### Decision

Do not publish the current filter-only shape as the primary helper.

Publish a combined helper with these semantics:

```ts
withFallbackAdvice(
  specific: Stream.Stream<AdviceElement, Error>,
  fallback: Stream.Stream<AdviceElement, Error>
): Stream.Stream<AdviceElement, Error>
```

It must:

1. collect `specific` exactly once;
2. emit the collected specific advice;
3. emit fallback file advice only for paths without specific file advice;
4. preserve non-file fallback advice;
5. preserve deterministic specific-before-fallback ordering.

A lower-level array-based filtering helper may remain private. Update the extensibility example and exported API list to use the safe combined helper.

## 5. Use one report rendering path

### Problem

`adviceLeaf`, `ruleLeaf`, `signalLeaf`, and `reportLeaves` form an older text-stream rendering path. The actual snapshot and watch products already use keyed `ReportBlock` construction through `batchReportBlocks`.

### Decision

Keep keyed block construction as the only production rendering path:

```text
signals + advice
  → ReportBlock[]
  → snapshot text or watch deltas
```

Delete:

- `adviceLeaf`,
- `ruleLeaf`,
- `signalLeaf`,
- `reportLeaves`,
- their text-only helper functions.

Migrate tests to `ruleReportBlocks`, `adviceReportBlocks`, `reportBlocks`, or `reportFromWiring` as appropriate. Do not export leaf assembly from the kernel.

## 6. Keep the source/project boundary narrow

### Decisions

1. Delete unused `SourceText`, `sourceText`, and `fileTexts` from `src/detectors/sources.ts`. Rules consume AST nodes or `RuleContext.sourceFile`; no production or test consumer uses this source-text stream.
2. Delete unused `TsIdentifier`, `TsSymbol`, and `TsFunctionDeclarationNode` schema declarations from `src/detectors/tsSchema.ts`.
3. Canonicalize the identical declaration-file/`node_modules` predicate currently duplicated as `isCheckableSourceFile` and `isProjectSourceFile`. Place it in a kernel-internal source utility consumed by both source emission and program-wide indexes.
4. Keep `ProjectConfig.parsed` for now. Splitting it from watch discovery would require reparsing TypeScript config or creating parallel discovery models. This is not a simplification.
5. Keep solution-style `tsconfig` reference discovery and scoped TypeScript watch acquisition/release unchanged.

## 7. Keep only snapshot data after watch gating

### Problem

`WorkspaceUpdate` carries `changed` and `removed` after they have already served their only purpose: suppressing quiet rebuilds in `workspaceUpdates`. The downstream full-recompute stage reads only `snapshots`.

### Decision

Retain project-local `SourceUpdate { context, changed, removed }` for diffing and quiet-rebuild gating. Emit a snapshot-only workspace batch after warm-up is complete.

This makes the actual contract explicit:

```text
one complete, consistent workspace snapshot → full signal recomputation
```

Update the direct test fixture that constructs `WorkspaceUpdate`.

## 8. Keep advice direct; make only proven local reductions

### Keep

- `collectSignals` and `deriveSignals` as the small batch-fold utilities.
- Direct stream composition in `defaultAdvice`.
- `byFile`, `countSummary`, `evidenceFromCounts`, `evidenceOrder`, `parentDirectories`, `collidingLines`, and `dominantRuleEvidence` as preset conveniences, not a second advice framework.
- `preferCurriedDataLastFunctions` as a helper rule that feeds advice without a rule leaf. Its physical location is secondary to its preset export and wiring role.

### Local reductions

1. **`hotSubsystem`**: group directory entries once instead of discovering directory membership twice. Preserve current thresholds, deepest-directory selection, and deterministic output.
2. **`sideEffectLaundering`**: compute `collidingLines(file.elements)` once per file; use that result for both the threshold and emitted evidence.

### Do not do without measurement

Do not replace simple per-path counting helpers with new indexes or introduce a generalized advice dependency graph. That would optimize the wrong problem and increase the authoring surface.

---

## Public surface

### `better-typescript` — kernel

Export only authoring, composition, and runner concepts:

```ts
export type {
  RuleCheck,
  RuleContext,
  ProgramContext,
  AstNodeElement,
  Subscription,
  NodeHandler,
  FileHandler,
  NamedRuleCheck,
  RuleSignals,
  ReportWiring
}

export {
  nodeCheck,
  fileCheck,
  nodeSubscriptions,
  fileSubscriptions,
  combineAll,
  withProgramIndex,
  checkFromSubscriptions,

  Location,
  Detection,
  detection,
  locateNode,

  AdviceElement,
  NamedDetection,
  namedDetection,
  collectSignals,
  deriveSignals,
  byFile,
  countSummary,
  parentDirectories,
  evidenceItem,
  evidenceFromCounts,
  evidenceOrder,
  adviceLocation,
  collidingLines,
  dominantRuleEvidence,
  withFallbackAdvice,

  namedRuleCheck,
  makeWiring,
  ruleSignal,

  reportFromWiring,
  watchReportFromWiring,
  runRuleCheckOnProject
}
```

Do not export:

```text
NodeSubscription
FileSubscription
nodeSubscription
fileSubscription
RuleSnapshot
SignalsBatch
WorkspaceUpdate
SourceUpdate
ReportBlock
workspaceSignals
collectAdvice
batchReportBlocks
signalsEquivalence
blockDelta
blockDeltas
adviceLeaf
ruleLeaf
reportLeaves
runRuleSignals
```

`ReportEvent` and event schemas remain optional later. They are not needed to author a fleet.

### `better-typescript/preset`

Export:

```ts
export * as rules from "./rules"
export * as advice from "./advice"
export { preferCurriedDataLastFunctions }
export {
  reportedRules,
  helperRules,
  defaultAdvice,
  defaultWiring,
  report,
  watchReport
}
```

---

## Config loading and CLI cutover

### Config contract

Retain the existing intended contract:

- Filename: `better-typescript.config.ts`.
- Accepted exports: default wiring, default zero-argument factory, named `wiring`, or named zero-argument `wiring` factory.
- Loader: `jiti`.
- Validate structure, then pass the result through `makeWiring`.
- Missing config: use `defaultWiring`.
- Load, compile, shape, or duplicate-name failures: stderr and exit code `2`.
- Config is reviewed, in-process user code; no sandbox.

### Resolution root

`extensibility-plan.md` says to resolve config under `--project` or cwd. Preserve that literal behavior unless the product deliberately changes it.

`discoverWorkspace` can search upward for `tsconfig.json`; that does not automatically mean config must follow the discovered tsconfig root when a user supplied a nested `--project` directory. If config should instead live at the discovered workspace root, amend the contract and document the changed behavior. Do not let loader implementation convenience decide it implicitly.

### CLI shape

```ts
const workspace = yield* discoverWorkspace(options.project)
const wiring = yield* loadWiring(options.project, defaultWiring)
const events = watchReportFromWiring(wiring)(workspace, Option.none())
```

Keep:

- stderr status lines,
- NDJSON stdout by default,
- `--pretty` rendering,
- watch-only operation,
- exit-code behavior.

---

## Implementation phases

### Phase 0 — lock down correctness and deletion candidates

1. Add the custom-rule same-location/different-message deduplication test.
2. Define the final detection identity policy, including `data` treatment.
3. Confirm no remaining imports before deleting:
   - `SourceText` / `fileTexts`,
   - `TsIdentifier` / `TsSymbol` / `TsFunctionDeclarationNode`,
   - text-leaf helpers,
   - `runRuleSignals`.
4. Remove the direct tests that exist only for deleted public-looking internals; replace them with runner/block behavior tests.

### Phase 1 — simplify internal execution ownership

1. Extract preset imports and default composition from `src/detectors/report.ts`.
2. Remove default aliases from `src/detectors/watch.ts`; define them under the preset instead.
3. Delete the obsolete text-leaf pipeline.
4. Delete dead source-text helpers and unused TypeScript schemas.
5. Canonicalize the source-file eligibility predicate.
6. Reduce `WorkspaceUpdate` to snapshots after watch gating.
7. Apply the one-pass `hotSubsystem` and `sideEffectLaundering` reductions.

### Phase 2 — establish package boundaries

1. Introduce `src/kernel.ts` and `src/preset.ts` without creating duplicate report/wiring implementations.
2. Promote `namedRuleCheck` and `ruleSignal`.
3. Add `makeWiring` and duplicate-name tests.
4. Expose only the kernel/preset surfaces listed above through `package.json` exports.
5. Do not make physical `src/` paths part of the consumer contract.

### Phase 3 — load explicit user fleets

1. Add `loadWiring` behind the agreed config-root rule.
2. Add `jiti`.
3. Load, normalize, shape-check, and validate config once before starting the watch stream.
4. Cut the CLI over to `watchReportFromWiring(wiring)`.
5. Keep `defaultWiring` as the missing-config fallback.

### Phase 4 — document the product boundary

1. Update `extensibility-plan.md` to incorporate this plan’s three refinements.
2. Add ADR-0009. It records:
   - kernel/preset exports,
   - explicit TypeScript config fleets,
   - structural `makeWiring` validation,
   - safe fallback-advice composition,
   - retained silent lookup semantics,
   - rejected registry/plugin mechanisms.
3. Update README with kernel vs preset imports, config resolution, a minimal rule, preset extension, and advice lookup examples.
4. Add an example config that is not loaded by self-host.
5. Update `.claude/commands/implement-rule.md` with the external-author path.

---

## Acceptance criteria

### Behavior and output

1. `npm run typecheck` and `npm test` pass.
2. `timeout 10 npm run dev` prints `No signals` for this repository.
3. No-config CLI output is unchanged from the current preset behavior.
4. `--pretty` and NDJSON event schemas remain unchanged.
5. Existing clearance-before-update event ordering remains unchanged.

### Kernel and preset

1. Importing `better-typescript` does not require importing the preset fleet.
2. Importing `better-typescript/preset` exposes the complete named reference fleet and `defaultWiring`.
3. `ReportWiring` remains direct code composition; no registry or dynamic discovery exists.
4. Internal batch/delta/rendering primitives are absent from package exports.

### Custom-fleet behavior

1. A config that wires only `noThrow` emits only that rule’s signals and empty advice.
2. A config that extends `defaultWiring.rules` with a probe rule emits both preset and probe leaves in deterministic order.
3. A custom advice derivation consuming `ruleSignal(ruleSignals)("no-mutation")` fires on the mutation fixture.
4. A custom rule emitting two distinct messages at the same location preserves both detections.
5. Duplicate names within rules or helpers fail with exit code `2` and include the colliding names.
6. Cross-array duplicate names remain accepted.
7. Invalid TypeScript config fails with exit code `2`.
8. Missing config uses the preset and exits successfully.
9. The safe fallback helper runs its specific advice input once per invocation and preserves specific-before-fallback order.

### Guardrails

Public documentation must not revive these retired concepts:

```text
Registry.make
FindingOf
detectorId
plugin discovery
matcher language
severity
suppression
```

## Rejected alternatives

### Registry or plugin manager

Rejected. It recreates concepts intentionally removed by ADR-0006 and adds validation, discovery, ordering, and lifecycle machinery that direct `ReportWiring` composition does not need.

### Rule map or record instead of ordered arrays

Rejected. Records silently overwrite duplicate names and obscure explicit leaf order. Arrays plus `makeWiring` give deterministic ordering and explicit duplicate errors.

### One package export that includes preset and kernel

Rejected. It makes custom fleet authors load preset implementation code and blurs the product boundary.

### Per-file incremental rule execution

Rejected. Checker-dependent rules observe the full program graph. Full recomputation against one consistent workspace snapshot is the correct simple model.

### A generic syntax-rule mini-DSL

Rejected. It saves small amounts of local repetition while creating a second rule-authoring language beside the direct `nodeCheck`/`fileCheck` API.

### Blanket replacement of classes with plain object literals

Rejected. It removes constructor validation/value semantics and conflicts with the repository’s own data-modeling conventions. Demote only accidental public constructors; retain or deliberately convert internal runtime models case by case.
