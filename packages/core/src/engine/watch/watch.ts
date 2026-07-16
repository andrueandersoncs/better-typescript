import {
  Array,
  Function,
  HashMap,
  HashSet,
  Match,
  Option,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import type * as ts from "typescript"
import type { WorkspaceConfigs } from "../../project/loadProject/data.js"
import { sourceUpdates } from "../sources/sources.js"
import type { ProgramContext, SourceUpdate } from "../sources/data.js"
import {
  batchReportBlocks,
  blockClearedEvent,
  blockEntry,
  blockSignalEvent,
  initialReportEvents,
  wiringSignalsArrayEquivalence,
  workspaceSignals
} from "../report/report.js"
import type { ReportBlock, WiringConfig, WiringSignals } from "../report/data.js"
import { ClearedEvent, EmptyReportEvent, SignalEvent, WorkspaceUpdate } from "./data.js"
import type { ReportEvent } from "./data.js"

const emptyContextCache: HashMap.HashMap<number, ProgramContext> = HashMap.empty()

/**
 * Merge every project's source updates into workspace-wide change batches.
 * Untouched projects reuse their latest ProgramContext; no AST is
 * materialized.
 *
 * @remarks
 *   Cached contexts are required because each emitted batch must contain every
 *   project's latest program without retaining AST snapshots.
 */
export const workspaceUpdates = (
  workspace: WorkspaceConfigs,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<WorkspaceUpdate> => {
  const projectCount = workspace.projects.length

  const updateStreams = Array.map(workspace.projects, (config, index) =>
    pipe(
      sourceUpdates(config, watchOptions),
      Stream.map((update) => Tuple.make(index, update))
    )
  )

  const merged = Stream.mergeAll(updateStreams, { concurrency: "unbounded" })

  const applyUpdate = (
    cache: HashMap.HashMap<number, ProgramContext>,
    indexed: readonly [number, SourceUpdate]
  ): readonly [HashMap.HashMap<number, ProgramContext>, ReadonlyArray<WorkspaceUpdate>] => {
    const [index, update] = indexed
    const hasArrived = HashMap.has(cache, index)
    const hasNoChanges = update.changed.length === 0
    const hasNoRemovals = update.removed.length === 0
    const arrivedWithoutChanges = hasArrived && hasNoChanges
    const isQuietRebuild = arrivedWithoutChanges && hasNoRemovals

    if (isQuietRebuild) {
      const emptyUpdates = Array.empty<WorkspaceUpdate>()

      return Tuple.make(cache, emptyUpdates)
    }

    const nextCache = HashMap.set(cache, index, update.context)
    const isWarm = HashMap.size(nextCache) === projectCount

    if (!isWarm) {
      const emptyUpdates = Array.empty<WorkspaceUpdate>()

      return Tuple.make(nextCache, emptyUpdates)
    }

    const contexts = Array.makeBy(projectCount, (order: number) =>
      pipe(
        HashMap.get(nextCache, order),
        Option.getOrElse(() => update.context)
      )
    )

    const emitted = new WorkspaceUpdate({
      rootPath: workspace.rootPath,
      contexts
    })

    const emittedUpdates = Array.of(emitted)

    return Tuple.make(nextCache, emittedUpdates)
  }

  return pipe(merged, Stream.mapAccum(Function.constant(emptyContextCache), applyUpdate))
}

/**
 * Full check recompute per batch: detection sets are always exactly what the
 * snapshot report would compute for the current programs. Per-file incremental
 * recompute is deliberately not built — checker-using checks observe other
 * files through the type graph, so file identity under-approximates their true
 * inputs.
 *
 * @remarks
 *   Full recompute is required because checker-using checks can depend on files
 *   outside the edited set through the type graph.
 */
export const signalUpdates =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <E, R>(
    updates: Stream.Stream<WorkspaceUpdate, E, R>
  ): Stream.Stream<ReadonlyArray<WiringSignals>, E, R> =>
    pipe(
      updates,
      Stream.mapEffect((update) => workspaceSignals(config)(update.rootPath)(update.contexts))
    )

/**
 * Compare complete signal sets for every configured wiring.
 *
 * @remarks
 *   Match state participates because a newly matched or fully removed glob scope
 *   must reach derivation and clearing. `Detection.data` remains best-effort
 *   because it is `Schema.Unknown`: fresh plain objects under-cut the gate but
 *   can never hide a real report change.
 */
export const signalsEquivalence = (
  a: ReadonlyArray<WiringSignals>,
  b: ReadonlyArray<WiringSignals>
): boolean => wiringSignalsArrayEquivalence(a, b)

/**
 * Derive report blocks from each complete wiring signal set.
 *
 * @remarks
 *   Derivation remains per wiring because each glob assignment is one independent
 *   policy boundary.
 */
export const reportBlockUpdates =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <E, R>(
    signals: Stream.Stream<ReadonlyArray<WiringSignals>, E, R>
  ): Stream.Stream<ReadonlyArray<ReportBlock>, E | DeriveError, R> =>
    pipe(signals, Stream.mapEffect(batchReportBlocks(config)))

const emptyReportText = (event: EmptyReportEvent): string => `No signals in ${event.rootPath}.`

/**
 * Render one event as the human-readable text block the --pretty flag prints.
 *
 * @remarks
 *   Kept separate from NDJSON encoding because --pretty needs a human-readable
 *   projection of the same events.
 */
export const renderEventText = (event: ReportEvent): string =>
  pipe(
    Match.value(event),
    Match.tag("signal", Struct.get<SignalEvent, "text">("text")),
    Match.tag("cleared", Struct.get<ClearedEvent, "text">("text")),
    Match.tag("empty", emptyReportText),
    Match.exhaustive
  )

/**
 * Pure per-block delta: clearances first (previous order) — previous blocks
 * whose key is absent from current emit their cleared event; then changed and
 * new blocks (current order) — key absent from previous or text differs emit
 * their signal event. Unchanged blocks emit nothing.
 *
 * @remarks
 *   Clearances precede signals because consumers must retire stale blocks before
 *   applying replacements for the same identity.
 */
export const blockDelta =
  (current: ReadonlyArray<ReportBlock>) =>
  (previous: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    const previousEntries = Array.map(previous, blockEntry)
    const previousByIdentity = HashMap.fromIterable(previousEntries)
    const currentIdentityList = Array.map(current, Struct.get("identity"))
    const currentIdentities = HashSet.fromIterable(currentIdentityList)

    const clearances = pipe(
      previous,
      Array.filter((block) => !HashSet.has(currentIdentities, block.identity)),
      Array.map(blockClearedEvent)
    )

    const updates = pipe(
      current,
      Array.filter((block) =>
        pipe(
          HashMap.get(previousByIdentity, block.identity),
          Option.match({
            onNone: Function.constTrue,
            onSome: (previousBlock) => previousBlock.text !== block.text
          })
        )
      ),
      Array.map(blockSignalEvent)
    )

    return Array.appendAll<ReportEvent, ReportEvent>(clearances, updates)
  }

const initialDeltaState: Option.Option<ReadonlyArray<ReportBlock>> = Option.none()

/**
 * Terminal gate: the first element emits every block as a signal event (or the
 * single empty-report event), each later element emits only its blockDelta —
 * nothing when no block changed, so quiet batches are silent.
 *
 * @remarks
 *   Quiet batches stay silent because continuous watch output should only surface
 *   real block changes after the initial report.
 */
export const blockDeltas =
  (rootPath: string) =>
  <E, R>(
    blocks: Stream.Stream<ReadonlyArray<ReportBlock>, E, R>
  ): Stream.Stream<ReportEvent, E, R> =>
    pipe(
      blocks,
      Stream.mapAccum(Function.constant(initialDeltaState), (previous, current) => {
        const events = pipe(
          previous,
          Option.match({
            onNone: () => initialReportEvents(rootPath)(current),
            onSome: blockDelta(current)
          })
        )

        const nextState = Option.some(current)

        return Tuple.make(nextState, events)
      })
    )

/**
 * The continuous product: a linear pipeline of stream transformers whose
 * elements each carry one consistent batch.
 *
 * Change propagation model: every node is a stream; a node propagates only when
 * its value differs from the one before. The gates, in pipeline order: source —
 * diffCheckableFiles on ts.SourceFile identity (the only equality ts objects
 * support; the abstract builder reuses unchanged files, so identity is content
 * equality there); batch — empty diffs dropped in workspaceUpdates; signals —
 * Stream.changesWith(signalsEquivalence); report — blockDeltas on block key
 * plus rendered text (the canonical content projection).
 *
 * Fan-in never tears because it happens inside an element (derivation reads
 * every signal from one completed signal array), never across independently-
 * ticking streams. Per-node external subscribers are derived views — broadcast
 * the signal-array stream, Stream.map the projection, gate with
 * Stream.changesWith — never independently recomputed streams.
 *
 * @remarks
 *   Linear gated stages are required because each stage must drop unchanged
 *   values while keeping derivation fan-in inside one batch element.
 */
export const watchReportFromConfig =
  <E>(config: WiringConfig<E>) =>
  (
    workspace: WorkspaceConfigs,
    watchOptions: Option.Option<ts.WatchOptions>
  ): Stream.Stream<ReportEvent, E> =>
    pipe(
      workspaceUpdates(workspace, watchOptions),
      signalUpdates(config),
      Stream.changesWith(signalsEquivalence),
      reportBlockUpdates(config),
      blockDeltas(workspace.rootPath)
    )
