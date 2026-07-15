# ADR-0011: Rules and advice are one concept

## Status

Accepted; public config shape superseded by ADR-0015

## Date

2026-07-10

## Context

The current implementation treats a source rule and a higher-order advice function as separate
product concepts:

- `RuleCheck` transforms the AST-node stream into `Detection` values.
- `ReportWiring` has separate `rules`, `helpers`, and `advice` fields.
- `NamedRuleCheck`, `RuleSignals`, `RuleSnapshot`, and `SignalsBatch` repeat the split throughout
  execution and watch state.
- `ruleSignal` takes one of two separate signal collections, while `defaultAdvice` reconstructs the
  same distinction with `elementsOf` and `helperElementsOf`.
- The preset exposes separate `rules` and `advice` namespaces and maintains `reportedRules`,
  `helperRules`, and `defaultAdvice` as separate collections.
- The physical `src/rules/` and `src/advice/` directories claim a distinction that does not hold
  consistently: `preferCurriedDataLastFunctions` is an AST-driven `RuleCheck` under `src/advice/`
  because it is a helper for a higher-order computation.

This is duplicated machinery around one actual operation: a named check emits a signal for one
completed analysis batch. A reported check emits a visible local signal; a silent check contributes
evidence for a derived signal; a derivation interprets those completed signals and emits
higher-level report content. All three already use ordinary Effect streams, are configured in
reviewed TypeScript, participate in the same snapshot/watch batch, and converge on `ReportBlock` and
`ReportEvent`.

The values emitted at the two stages are not interchangeable records. `Detection` carries an exact
source location, message, hint, and optional opaque `data`; its `data` participates in
deduplication, watch equality, and the `imperativeStateManager` derivation. `AdviceElement` carries
a reporting scope, title, remediation, and evidence. Flattening those into a broad optional-field
record or a tagged union would make every aggregation helper narrow a type while hiding the
semantics the code depends on. That is false uniformity, not a simplification.

ADR-0003 previously attempted a broader unification through `Detector`, `Finding`, ids, roles,
metadata-derived dependencies, and a scheduler. ADR-0006 rejected that model because it made the
product orbit metadata rather than direct functions and streams. ADR-0009 then made the current
`ReportWiring` shape public, but retained the rule/helper/advice distinction.

This decision removes the independent _wired_ categories and batch structures. It preserves distinct
payload schemas only where they carry genuinely different source evidence and report presentation
semantics.

## Decision

### One wired concept: check

A **check** is the only runnable, named item in a wiring. It transforms the upstream AST-node stream
into `Detection` values, which the runner materializes as that check's **signal** for one complete
batch.

```ts
export type Check = (nodes: Stream.Stream<AstNodeElement, Error>) => Stream.Stream<Detection, Error>

export class NamedCheck extends Data.Class<{
  readonly name: string
  readonly check: Check
  readonly reported: boolean
}> {}

// One deduplicated, first-occurrence-ordered result from one check in one batch.
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
}> {}

export class Wiring extends Data.Class<{
  readonly checks: ReadonlyArray<NamedCheck>
  readonly derive: (signals: ReadonlyArray<Signal>) => Stream.Stream<Advice, Error>
}> {}
```

`Check`, `NamedCheck`, `Signal`, and `Wiring` replace `RuleCheck`, `NamedRuleCheck`, `RuleSignals`,
`RuleSnapshot`, `SignalsBatch`, and `ReportWiring`. `RuleContext` becomes `CheckContext`;
`AdviceElement` becomes `Advice`. These are vocabulary cutovers, not aliases.

A check name remains a prose-facing label used for the local block header and for derivation lookup.
It is not a detector id, a registration key, or metadata from which the engine computes
dependencies.

### Visibility is one bit, not a category

`reported: true` replaces the whole reported-rule collection. `reported: false` replaces the helper
collection.

A silent check:

1. runs and is deduplicated exactly like every other check;
2. participates in the snapshot and watch equivalence gate;
3. is available to `derive` through its name; and
4. contributes no local report block.

The default is `reported: true` for handwritten configuration entries. A `namedCheck` constructor
creates a reported check; `silentCheck` creates a silent one. Both live in the same ordered `checks`
array. Names are unique over the whole array. A configuration that formerly reused a name once in
`rules` and once in `helpers` now fails loudly at startup because one lookup namespace must be
unambiguous.

### Derivation is direct composition, not a second registry

`derive` receives the complete materialized signals of all checks in a batch. It uses one total
lookup function:

```ts
export const signalOf =
  (signals: ReadonlyArray<Signal>) =>
  (name: string): Stream.Stream<Detection, Error> =>
    /* matching signal's replayable detection stream, or Stream.empty */
```

Missing names continue to yield `Stream.empty`, preserving the current `ruleSignal` behavior. A
renaming migration must update every derivation lookup at the same time.

The direct source checks remain data-parallel and share one snapshotted AST stream. Derived
computations retain their existing explicit Effect composition inside `derive`: `pipelineHostile`
can consume a silent check, and `systemicHotspots` can consume the materialized outputs of other
derivations, without the engine learning a dependency graph. This keeps the useful part of ADR-0006:

- no registry;
- no scheduler;
- no ids, roles, severities, suppressions, or dependency metadata; and
- no rule-to-rule signal access from source checks.

The source-versus-derived stage boundary remains an execution invariant, not a user-visible category
or set of independently named wiring data structures. Every derivation and every render runs only
after one complete set of check signals is materialized. The watch pipeline continues to compare the
whole signal set, including silent checks, before deriving output. This prevents torn fan-in and
preserves snapshot/watch equivalence.

### Payload schemas remain semantic, not architectural species

`Detection` remains the source-evidence schema. `Advice` replaces `AdviceElement` as the aggregate
report-content schema. Neither is a separately wired item or configuration category:

- `Detection` remains exact local evidence, including `data` equality.
- `Advice` remains aggregate content, including scope and evidence.
- `Signal` is the one materialized check/batch representation.
- `ReportBlock` remains the one common rendered representation.

This deliberately rejects an artificial `Signal = Detection | Advice` union or a single
optional-field record. The implementation must remove the rule/advice architecture, not erase
required evidence semantics.

### One public configuration shape

`better-typescript.config.ts` changes from:

```ts
{
  rules: ReadonlyArray<{ name: string; check: RuleCheck }>
  helpers: ReadonlyArray<{ name: string; check: RuleCheck }>
  advice: (rules: ReadonlyArray<RuleSignals>, helpers: ReadonlyArray<RuleSignals>) =>
    Stream.Stream<AdviceElement, Error>
}
```

to:

```ts
{
  checks: ReadonlyArray<{ name: string; check: Check; reported?: boolean }>
  derive: (signals: ReadonlyArray<Signal>) => Stream.Stream<Advice, Error>
}
```

For example:

```ts
export default makeWiring({
  checks: [...defaultChecks, namedCheck("acme/no-console-log", noConsoleLog)],
  derive: (signals) => {
    const elementsOf = signalOf(signals)
    const preset = defaultWiring.derive(signals)
    const local = consoleLogBoundaryAdvice(elementsOf("acme/no-console-log"))

    return pipe(preset, Stream.concat(local))
  }
})
```

The config filename, `default`/`wiring` export forms, zero-argument factories, load-once lifecycle,
and `ProjectWiringError` path stay unchanged. The loader validates one `checks` array, defaults an
omitted `reported` field to `true`, requires a `derive` function, and reports global duplicate check
names.

This is a clean breaking cutover for in-repo configuration. The package is private, and no adapter,
deprecated export, compatibility alias, or dual config shape will remain.

### Preserve the output contract deliberately

The NDJSON event tags, pretty output, ordering, and two report-block key forms are consumer-facing
rendering contracts from ADR-0008 and ADR-0010. They are not engine categories. This migration
preserves them byte-for-byte:

- `signal`, `cleared`, and `empty` event tags remain unchanged;
- the `_tag: "rule"` and `_tag: "advice"` report-key shapes remain serialization forms at the report
  boundary;
- aggregate blocks remain first and sort by scope then path;
- reported local blocks remain in `checks` order and group locations by `(name, message, hint)`;
- silent checks remain invisible; and
- watch cleared/changed behavior, CLI flags, stdout/stderr separation, and exit codes remain
  unchanged.

The old key tags do not license old internal model names. They remain only because changing a
documented event identity alongside an architectural cutover would add a second, unrelated migration
with no product benefit.

### Physical topology follows the model

Move all 51 visible source checks, the one silent source check, and seven aggregate derivations
under `src/checks/`. Merge their exports into one `src/checks/index.ts`. In particular,
`src/advice/preferCurriedDataLastFunctions.ts` moves with the other source checks.

Move the execution implementation from `src/detectors/` to `src/engine/`:

- `rule.ts` becomes `check.ts` and absorbs `src/rules/ruleCheck.ts`;
- `summary.ts` becomes `derive.ts`;
- report, watch, sources, location, and TypeScript-schema support move beneath the same engine
  directory;
- Move `src/rules/tsNode.ts`, `tsSignature.ts`, and `tsType.ts` to `src/checks/support/`; they are
  shared source-check implementation support, not standalone checks or engine-wide report
  infrastructure.
- `src/rules/`, `src/advice/`, and `src/detectors/` disappear.

This is a clean move, not a compatibility re-export layer.

## Alternatives Considered

### Keep the current split and only rename it

- Pros: small edit.
- Cons: preserves two arrays, two duplicate scans, two lookup inputs, two batch arms, a physical
  category boundary, and a misfiled helper.
- Rejected. The duplicated architecture would survive with different labels.

### One flat `Signal` payload record or `Detection | Advice` union

- Pros: appears to make every emitted value identical.
- Cons: source evidence and aggregate guidance have materially different fields, equality rules, and
  consumers. Optional fields or pervasive narrowing would replace explicit semantics with a wider,
  shallower interface.
- Rejected. `Signal` unifies completed check output; payload schemas remain narrow where their
  semantics differ.

### Put every derived computation in the `checks` array

- Pros: superficial symmetry between source and derived functions.
- Cons: the engine would need ordering and dependency knowledge for advice-over-advice, fallback
  precedence, and named inputs. That recreates the registry/scheduler model ADR-0006 rejected.
- Rejected. Dependent composition stays as visible TypeScript inside `derive`.

### Revive ADR-0003's `Detector` registry

- Pros: metadata could describe dependencies and report roles.
- Cons: ids, roles, graph metadata, a scheduler, and validation machinery would dominate the direct
  stream model.
- Rejected. This ADR preserves ADR-0006's direct function/stream ontology.

### Rename the NDJSON report-key tags in this migration

- Pros: public vocabulary would mirror `Check`.
- Cons: breaks correlation and clear-event identity for consumers while adding no simplification to
  the engine.
- Rejected. Wire tags are presentation forms; a future output redesign needs its own decision.

### Keep compatibility aliases or accept both configuration shapes

- Pros: permits incremental downstream migration.
- Cons: leaves the discarded conceptual model in the product and doubles loader and documentation
  surface.
- Rejected. This repository has no external compatibility requirement and the package is private.

## Implementation plan

### 1. Capture the behavioral baseline

Before changing the model, run the existing full suite and capture the self-hosting one-shot NDJSON
and pretty output outside the repository for a byte-for-byte comparison.

Characterize or retain tests for:

- source-check locations, messages, hints, allowed cases, and fixture diagnostics;
- all seven aggregate thresholds, scopes, evidence, and near-miss cases;
- workspace deduplication, including `Detection.data` equality;
- local block grouping and aggregate-first ordering;
- silent-check invisibility while still feeding derivation;
- fallback behavior: specific output runs once, emits first, and suppresses only file-level fallback
  for covered files;
- snapshot/watch batch equivalence, changes, clears, and quiet batches;
- NDJSON keys/events, pretty output, stderr status, and exit codes; and
- custom configuration loading and all invalid wiring errors.

The characterization establishes the output and behavior that the model cutover must retain. It is
not a request to preserve old names or config fields.

### 2. Replace the central model in one compile-atomic cutover

Migrate `src/detectors/rule.ts`, `src/rules/ruleCheck.ts`, `src/detectors/summary.ts`, and
`src/detectors/report.ts` in dependency order:

1. Rename `RuleContext`/`RuleCheck` to `CheckContext`/`Check`, and fold the subscription helpers
   into `src/engine/check.ts`.
2. Rename `AdviceElement` to `Advice`; retain the aggregation utilities and their exact behavior.
3. Introduce `NamedCheck`, `Signal`, and `Wiring` as the sole wiring and batch data structures.
4. Replace the two arrays, `splitSignalsBatch`, `RuleSnapshot`, `RuleSignals`, and `snapshotSignals`
   with one ordered signal collection.
5. Replace `namedRuleCheck` and `ruleSignal` with `namedCheck`, `silentCheck`, and `signalOf`.
6. Replace category-specific duplicate validation with one global duplicate-name scan and a
   `DuplicateCheckNamesError`.
7. Rename `runRuleCheckOnProject` to `runCheckOnProject` and migrate every caller.
8. Keep source deduplication exactly keyed by path, line, column, message, hint, and
   `Equal.equals(data)`.

Update `src/detectors/watch.ts` at the same time. Its equivalence gate must compare every `Signal`,
regardless of `reported`; `reported` changes rendering, not execution or invalidation.

Focused proof: `tests/report.test.ts`, `tests/watch.test.ts`, `tests/loadWiring.test.ts`, and all
affected source-check fixtures. Add a test that a reported and silent check with the same name
fails, and a loader test that an omitted `reported` field defaults to `true`.

### 3. Rewire the preset through one signal set

Replace `reportedRules`, `helperRules`, and `defaultAdvice` in `src/preset/defaultWiring.ts` with
`defaultChecks` and `defaultDerive`.

- Put all 51 visible checks and the silent `prefer-curried-data-last-functions` check in one ordered
  array.
- Use `signalOf(signals)` for every derived input.
- Build aggregate input from reported signals only where the current behavior folds only reported
  rules. This preserves density, dominance, subsystem, and collision thresholds rather than
  accidentally counting silent evidence.
- Preserve the existing direct composition order: specific derived output, surviving density
  fallback, subsystem output, dominance output, then systemic output.
- Replace the `highSignalDensity` title comparison with the already materialized
  **post-suppression** density output. `systemicHotspots` must receive exactly the density advice
  that survives file-level fallback suppression; a covered dense file must not count toward its
  threshold.
- Expose and reuse the existing uncovered-file filter from the unified derivation surface so
  `defaultDerive` can retain the surviving density output directly. Do not duplicate fallback policy
  or rediscover it from display text.
- Keep `withFallbackAdvice` behavior intact.

Focused proof: `tests/advice.test.ts` and `tests/report.test.ts`, plus new cases proving that a
silent check with ten same-file detections does not create a reported-only density signal and that
suppressed density advice does not count toward `systemicHotspots`.

### 4. Migrate the configuration and public boundaries

Update these surfaces as one public cutover:

- `src/project/loadWiring.ts`: validate `checks` and `derive`; update error text, duplicate
  propagation, and structural conversion.
- `src/kernel.ts`: replace the old core names with `Check`, `CheckContext`, `NamedCheck`, `Signal`,
  `Wiring`, `namedCheck`, `silentCheck`, `signalOf`, and `runCheckOnProject`; retain the public
  source-authoring surface (`nodeCheck`, `fileCheck`, `checkFromSubscriptions`, `combineAll`,
  `nodeSubscriptions`, `fileSubscriptions`, `withProgramIndex`, `Detection`, `Location`,
  `detection`, `locateNode`, `AstNodeElement`, and subscription and program-context types) plus the
  renamed derivation/report helpers used by custom configurations.
- `src/preset.ts`: export `checks`, `defaultChecks`, `defaultDerive`, `defaultWiring`, `report`, and
  `watchReport`; remove separate rules/advice namespaces and the special helper re-export.
- `src/index.ts`, `bench/rules.bench.ts`, examples, and tests: migrate imports and wiring literals
  in the same change.
- `examples/extend-preset/better-typescript.config.ts`: demonstrate the new shape with a reported
  custom check and one derivation lookup, then include the example in an existing typecheck project
  or add an equivalent focused compile smoke test so this public import surface cannot drift
  unnoticed.

Delete every old export and config field after callers migrate. In particular, do not retain
`RuleCheck`, `ReportWiring`, `AdviceElement`, `rules`, `helpers`, `advice`, `namedRuleCheck`,
`ruleSignal`, or re-export shims.

Focused proof: `tests/loadWiring.test.ts`, `tests/report.test.ts`, `tests/watch.test.ts`, and
`tests/cli.test.ts`. The CLI suite should require no behavioral expectation changes because the wire
contract is preserved.

### 5. Complete the physical move and documentation cutover

Move implementation modules to `src/checks/` and `src/engine/` only after the model compiles and
behavior is proven. Rewrite import paths mechanically across source, tests, benchmark, and example
code; do not combine those moves with semantic changes.

Then update documentation to describe checks, signals, silent checks, and `derive`:

- `README.md`: architecture model, kernel/preset exports, configuration shape, examples, analysis
  pipeline, and ADR index;
- `AGENTS.md`: direct maintainers to the unified check modules instead of `src/rules/`;
- `.claude/commands/implement-rule.md`: replace it with an equivalent check-authoring command that
  documents reported versus silent checks and derivation composition; and
- this ADR's cross-references: record the final exact scope of supersession.

Historical ADRs are not rewritten. They remain a record of prior decisions.

### 6. Run the full verification bar

After focused suites pass, run:

```text
npm test
npm run typecheck
npm run format:check
npm run build
timeout 10 npm run dev
npm run bench
```

The bounded self-hosting run must begin with `No signals`, as required by `AGENTS.md`. Compare its
NDJSON and pretty output with the baseline from step 1. The benchmark remains informational, but it
must compile and follow the renamed public surface.

## Consequences

- `Check` and `Signal` become the durable execution vocabulary. A check's source/aggregate role is
  expressed by where it appears in the direct composition, not by a registry category, class
  hierarchy, or second wiring collection.
- The engine loses duplicated names and split/replay bookkeeping: `RuleCheck`, `NamedRuleCheck`,
  `RuleSignals`, `RuleSnapshot`, `SignalsBatch`, `ReportWiring`, `rules`, `helpers`, `advice`,
  `ruleSignal`, and the old physical category directories are removed.
- Source evidence and aggregate report content remain correctly typed rather than being forced into
  an optional-field pseudo-union. `Detection` and `Advice` are payload schemas behind the one
  check/signal execution model, not independent authoring or configuration species.
- User wiring becomes simpler but intentionally breaking: `checks` plus `derive`, one name
  namespace, and explicit `reported` policy. Any in-repo configuration and example must migrate in
  the same cutover.
- Output remains stable for coding-agent consumers. The existing report-key forms are retained only
  at serialization; no old internal architecture is retained for them.
- ADR-0006 remains authoritative for direct Effect function/stream composition and its rejection of
  registry/scheduler machinery. This ADR supersedes the rule/advice distinction in ADR-0006.
- ADR-0009 remains authoritative for explicit reviewed TypeScript configuration, no discovery, no
  hot reload, and no plugin registry. This ADR supersedes its `ReportWiring` shape, its separate
  duplicate-name domains, and its rule/advice/helper vocabulary.
- ADR-0008 and ADR-0010 remain authoritative for NDJSON events, rendering, one-shot behavior, and
  watch deltas. Their wire contract is deliberately unchanged.
- ADR-0003 and ADR-0005 remain historical and superseded where they depend on detector metadata,
  registry behavior, or generated architecture machinery.
