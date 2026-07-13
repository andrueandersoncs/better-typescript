import {
  Array,
  Chunk,
  Effect,
  Equal,
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
import type {
  LoadedWorkspace,
  ProjectConfig,
  WorkspaceConfigs
} from "../../project/loadProject/data.js"
import { astNodesFromContext, sourceUpdates } from "../sources/sources.js"
import type { AstNodeElement, SourceUpdate } from "../sources/data.js"
import type { Detection } from "../location/data.js"
import {
  batchReportBlocks,
  reportBlocksFromWiring,
  workspaceSignals
} from "../report/report.js"
import type { ReportBlock, Signal, Wiring } from "../report/data.js"
import {
  ClearedEvent,
  EmptyReportEvent,
  SignalEvent,
  WorkspaceUpdate,
  type ReportEvent
} from "./data.js"

const emptySnapshotCache: HashMap.HashMap<
  number,
  Chunk.Chunk<AstNodeElement>
> = HashMap.empty()

/**
 * Merge every project's source updates into workspace-wide change batches:
 * only the updated project is re-traversed, the other projects' node
 * snapshots come from the per-project cache, and nothing emits until every
 * project's initial program has arrived.
 */
export const workspaceUpdates = (
  workspace: WorkspaceConfigs,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<WorkspaceUpdate, Error> => {
  const projectCount = workspace.projects.length

  const updateStreams = Array.map(workspace.projects, (config, index) =>
    pipe(
      sourceUpdates(config, watchOptions),
      Stream.map((update) => Tuple.make(index, update))
    )
  )

  const merged = Stream.mergeAll(updateStreams, { concurrency: "unbounded" })

  // Drop empty rebuilds after warm-up because only the initial batch must report an empty workspace.
  const applyUpdate = Effect.fn("applyProjectUpdate")(function* (
    cache: HashMap.HashMap<number, Chunk.Chunk<AstNodeElement>>,
    indexed: readonly [number, SourceUpdate]
  ) {
    const [index, update] = indexed
    const hasArrived = HashMap.has(cache, index)
    const hasNoChanges = update.changed.length === 0
    const hasNoRemovals = update.removed.length === 0
    const hasEmptyDiff = hasNoChanges && hasNoRemovals
    const isQuietRebuild = hasArrived && hasEmptyDiff

    if (isQuietRebuild) {
      const nested2 = Option.none<WorkspaceUpdate>()
      return Tuple.make(cache, nested2)
    }

    const nodes = astNodesFromContext(update.context)
    const snapshot = yield* Stream.runCollect(nodes)
    const nextCache = HashMap.set(cache, index, snapshot)
    const isWarm = HashMap.size(nextCache) === projectCount

    if (!isWarm) {
      const nested3 = Option.none<WorkspaceUpdate>()
      return Tuple.make(nextCache, nested3)
    }

    const snapshots = Array.makeBy(projectCount, (order: number) =>
      pipe(
        HashMap.get(nextCache, order),
        Option.getOrElse(() => Chunk.empty<AstNodeElement>())
      )
    )

    const emitted = new WorkspaceUpdate({ snapshots })

    const nested4 = Option.some(emitted)
    return Tuple.make(nextCache, nested4)
  })

  return pipe(
    merged,
    Stream.mapAccumEffect(emptySnapshotCache, applyUpdate),
    Stream.filterMap(Function.identity)
  )
}

/**
 * Full check recompute per batch: detection sets are always exactly what the
 * snapshot report would compute for the current programs. Per-file incremental
 * recompute is deliberately not built — checker-using checks observe other
 * files through the type graph, so file identity under-approximates their
 * true inputs.
 */
export const signalUpdates =
  (wiring: Wiring) =>
  (
    updates: Stream.Stream<WorkspaceUpdate, Error>
  ): Stream.Stream<ReadonlyArray<Signal>, Error> =>
    pipe(
      updates,
      Stream.mapEffect((update) => workspaceSignals(wiring)(update.snapshots))
    )

const detectionEquals = (a: Detection, b: Detection): boolean => {
  const samePath = a.location.path === b.location.path
  const sameLine = a.location.line === b.location.line
  const sameColumn = a.location.column === b.location.column
  const sameMessage = a.message === b.message
  const sameHint = a.hint === b.hint
  const sameData = Equal.equals(a.data, b.data)

  const conditions = Array.make(
    samePath,
    sameLine,
    sameColumn,
    sameMessage,
    sameHint,
    sameData
  )

  return Array.every(conditions, Boolean)
}

const detectionsEquivalence = Array.getEquivalence(detectionEquals)

const signalEquals = (a: Signal, b: Signal): boolean => {
  const sameName = a.name === b.name
  const sameDetections = detectionsEquivalence(a.detections, b.detections)

  return sameName && sameDetections
}

const signalArrayEquivalence = Array.getEquivalence(signalEquals)

/**
 * Detection-set equality per signal. Best-effort on Detection.data by design:
 * it is Schema.Unknown, so a check that builds a fresh plain data object per
 * run compares unequal and the batch passes through — the gate under-cuts,
 * never over-cuts, and correctness never depends on it. The reported bit is
 * intentionally ignored because visibility is rendering policy, not execution
 * or invalidation policy.
 */
export const signalsEquivalence = (
  a: ReadonlyArray<Signal>,
  b: ReadonlyArray<Signal>
): boolean => signalArrayEquivalence(a, b)

/**
 * Within each element the derivation graph runs unchanged: every materialized
 * signal is already present, and wiring.derive consumes the full batch.
 */
export const reportBlockUpdates =
  (wiring: Wiring) =>
  (
    signals: Stream.Stream<ReadonlyArray<Signal>, Error>
  ): Stream.Stream<ReadonlyArray<ReportBlock>, Error> =>
    pipe(signals, Stream.mapEffect(batchReportBlocks(wiring)))

const emptyReportText = (event: EmptyReportEvent): string =>
  `No signals in ${event.rootPath}.`

/**
 * Render one event as the human-readable text block the --pretty flag prints.
 */
export const renderEventText = (event: ReportEvent): string =>
  pipe(
    Match.value(event),
    Match.tag("signal", Struct.get("text")),
    Match.tag("cleared", Struct.get("text")),
    Match.tag("empty", emptyReportText),
    Match.exhaustive
  )

const blockSignalEvent = (block: ReportBlock): SignalEvent =>
  new SignalEvent({ key: block.key, text: block.text })

const blockClearedEvent = (block: ReportBlock): ClearedEvent =>
  new ClearedEvent({ key: block.key, text: block.cleared })

const blockEntry = (block: ReportBlock): readonly [string, ReportBlock] =>
  Tuple.make(block.identity, block)

/**
 * Pure per-block delta: clearances first (previous order) — previous blocks
 * whose key is absent from current emit their cleared event; then changed and
 * new blocks (current order) — key absent from previous or text differs emit
 * their signal event. Unchanged blocks emit nothing.
 */
export const blockDelta =
  (previous: ReadonlyArray<ReportBlock>) =>
  (current: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
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

const initialReportEvents =
  (rootPath: string) =>
  (blocks: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    const emptyReportEvent = new EmptyReportEvent({ rootPath })
    return blocks.length === 0
      ? Array.of(emptyReportEvent)
      : Array.map(blocks, blockSignalEvent)
  }

const initialDeltaState: Option.Option<ReadonlyArray<ReportBlock>> =
  Option.none()

/**
 * Terminal gate: the first element emits every block as a signal event (or
 * the single empty-report event), each later element emits only its
 * blockDelta — nothing when no block changed, so quiet batches are silent.
 */
export const blockDeltas =
  (rootPath: string) =>
  (
    blocks: Stream.Stream<ReadonlyArray<ReportBlock>, Error>
  ): Stream.Stream<ReportEvent, Error> =>
    pipe(
      blocks,
      Stream.mapAccum(initialDeltaState, (previous, current) => {
        const events = pipe(
          previous,
          Option.match({
            onNone: () => initialReportEvents(rootPath)(current),
            onSome: (before) => blockDelta(before)(current)
          })
        )

        const nested5 = Option.some(current)
        return Tuple.make(nested5, events)
      }),
      Stream.flattenIterables
    )

/**
 * The one-shot product: one loaded workspace snapshot mapped through the same
 * first-batch event vocabulary the continuous pipeline emits.
 */
export const reportEventsFromWiring =
  (wiring: Wiring) =>
  (workspace: LoadedWorkspace): Stream.Stream<ReportEvent, Error> =>
    pipe(
      reportBlocksFromWiring(wiring)(workspace),
      Effect.map(initialReportEvents(workspace.rootPath)),
      Stream.fromIterableEffect
    )

/**
 * The continuous product: a linear pipeline of stream transformers whose
 * elements each carry one consistent batch.
 *
 * Change propagation model: every node is a stream; a node propagates only
 * when its value differs from the one before. The gates, in pipeline order:
 * source — diffCheckableFiles on ts.SourceFile identity (the only equality ts
 * objects support; the abstract builder reuses unchanged files, so identity
 * is content equality there); batch — empty diffs dropped in
 * workspaceUpdates; signals — Stream.changesWith(signalsEquivalence); report
 * — blockDeltas on block key plus rendered text (the canonical content
 * projection).
 *
 * Fan-in never tears because it happens inside an element (derivation reads
 * every signal from one completed signal array), never across independently-
 * ticking streams. Per-node external subscribers are derived views — broadcast
 * the signal-array stream, Stream.map the projection, gate with
 * Stream.changesWith — never independently recomputed streams.
 */
export const watchReportFromWiring =
  (wiring: Wiring) =>
  (
    workspace: WorkspaceConfigs,
    watchOptions: Option.Option<ts.WatchOptions>
  ): Stream.Stream<ReportEvent, Error> =>
    pipe(
      workspaceUpdates(workspace, watchOptions),
      signalUpdates(wiring),
      Stream.changesWith(signalsEquivalence),
      reportBlockUpdates(wiring),
      blockDeltas(workspace.rootPath)
    )
