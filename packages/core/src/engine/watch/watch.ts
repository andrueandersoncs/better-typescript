import {
  Array,
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
  WorkspaceConfigs
} from "../../project/loadProject/data.js"
import { sourceUpdates } from "../sources/sources.js"
import type { ProgramContext, SourceUpdate } from "../sources/data.js"
import type { Detection } from "../location/data.js"
import {
  batchReportBlocks,
  reportBlocksFromConfig,
  reportBlocksFromWorkspaceConfigs,
  workspaceSignals
} from "../report/report.js"
import type {
  ReportBlock,
  Signal,
  WiringConfig,
  WiringSignals
} from "../report/data.js"
import {
  ClearedEvent,
  EmptyReportEvent,
  SignalEvent,
  WorkspaceUpdate
} from "./data.js"
import type { ReportEvent } from "./data.js"

const emptyContextCache: HashMap.HashMap<number, ProgramContext> =
  HashMap.empty()

/**
 * Merge every project's source updates into workspace-wide change batches.
 * Untouched projects reuse their latest ProgramContext; no AST is materialized.
 * @remarks Cached contexts are required because each emitted batch must contain
 * every project's latest program without retaining AST snapshots.
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

  const applyUpdate = (
    cache: HashMap.HashMap<number, ProgramContext>,
    indexed: readonly [number, SourceUpdate]
  ): readonly [
    HashMap.HashMap<number, ProgramContext>,
    Option.Option<WorkspaceUpdate>
  ] => {
    const [index, update] = indexed
    const hasArrived = HashMap.has(cache, index)
    const hasNoChanges = update.changed.length === 0
    const hasNoRemovals = update.removed.length === 0
    const arrivedWithoutChanges = hasArrived && hasNoChanges
    const isQuietRebuild = arrivedWithoutChanges && hasNoRemovals

    if (isQuietRebuild) {
      const noUpdate = Option.none<WorkspaceUpdate>()

      return Tuple.make(cache, noUpdate)
    }

    const nextCache = HashMap.set(cache, index, update.context)
    const isWarm = HashMap.size(nextCache) === projectCount

    if (!isWarm) {
      const noUpdate = Option.none<WorkspaceUpdate>()

      return Tuple.make(nextCache, noUpdate)
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

    const updateOption = Option.some(emitted)

    return Tuple.make(nextCache, updateOption)
  }

  return pipe(
    merged,
    Stream.mapAccum(emptyContextCache, applyUpdate),
    Stream.filterMap(Function.identity)
  )
}

/**
 * Full check recompute per batch: detection sets are always exactly what the
 * snapshot report would compute for the current programs. Per-file incremental
 * recompute is deliberately not built — checker-using checks observe other
 * files through the type graph, so file identity under-approximates their
 * true inputs.
 * @remarks Full recompute is required because checker-using checks can depend
 * on files outside the edited set through the type graph.
 */
export const signalUpdates =
  (config: WiringConfig) =>
  (
    updates: Stream.Stream<WorkspaceUpdate, Error>
  ): Stream.Stream<ReadonlyArray<WiringSignals>, Error> =>
    pipe(
      updates,
      Stream.mapEffect((update) =>
        workspaceSignals(config)(update.rootPath)(update.contexts)
      )
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

const wiringSignalsEquals = (a: WiringSignals, b: WiringSignals): boolean => {
  const sameMatchState = a.matched === b.matched
  const sameSignals = signalArrayEquivalence(a.signals, b.signals)

  return sameMatchState && sameSignals
}

const wiringSignalsArrayEquivalence = Array.getEquivalence(wiringSignalsEquals)

/**
 * Compare complete signal sets for every configured wiring.
 * @remarks Match state participates because a newly matched or fully removed
 * glob scope must reach derivation and clearing. `Detection.data` remains
 * best-effort because it is `Schema.Unknown`: fresh plain objects under-cut the
 * gate but can never hide a real report change.
 */
export const signalsEquivalence = (
  a: ReadonlyArray<WiringSignals>,
  b: ReadonlyArray<WiringSignals>
): boolean => wiringSignalsArrayEquivalence(a, b)

/**
 * Derive report blocks from each complete wiring signal set.
 * @remarks Derivation remains per wiring because each glob assignment is one
 * independent policy boundary.
 */
export const reportBlockUpdates =
  (config: WiringConfig) =>
  (
    signals: Stream.Stream<ReadonlyArray<WiringSignals>, Error>
  ): Stream.Stream<ReadonlyArray<ReportBlock>, Error> =>
    pipe(signals, Stream.mapEffect(batchReportBlocks(config)))

const emptyReportText = (event: EmptyReportEvent): string =>
  `No signals in ${event.rootPath}.`

/**
 * Render one event as the human-readable text block the --pretty flag prints.
 * @remarks Kept separate from NDJSON encoding because --pretty needs a
 * human-readable projection of the same events.
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
 * @remarks Clearances precede signals because consumers must retire stale
 * blocks before applying replacements for the same identity.
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
 * @remarks Quiet batches stay silent because continuous watch output should
 * only surface real block changes after the initial report.
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
            onSome: blockDelta(current)
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
 * @remarks Shares the continuous event vocabulary because one-shot and watch
 * consumers should parse the same report events.
 */
export const reportEventsFromConfig =
  (config: WiringConfig) =>
  (workspace: LoadedWorkspace): Stream.Stream<ReportEvent, Error> =>
    pipe(
      reportBlocksFromConfig(config)(workspace),
      Effect.map(initialReportEvents(workspace.rootPath)),
      Stream.fromIterableEffect
    )

/** Analyze a discovered workspace without retaining all project Programs. */
export const reportEventsFromWorkspaceConfigs =
  (config: WiringConfig) =>
  (workspace: WorkspaceConfigs): Stream.Stream<ReportEvent, Error> =>
    pipe(
      reportBlocksFromWorkspaceConfigs(config)(workspace),
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
 * @remarks Linear gated stages are required because each stage must drop
 * unchanged values while keeping derivation fan-in inside one batch element.
 */
export const watchReportFromConfig =
  (config: WiringConfig) =>
  (
    workspace: WorkspaceConfigs,
    watchOptions: Option.Option<ts.WatchOptions>
  ): Stream.Stream<ReportEvent, Error> =>
    pipe(
      workspaceUpdates(workspace, watchOptions),
      signalUpdates(config),
      Stream.changesWith(signalsEquivalence),
      reportBlockUpdates(config),
      blockDeltas(workspace.rootPath)
    )
