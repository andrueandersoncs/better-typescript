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

// Cached contexts are kept because each batch needs every project's latest program without ASTs.
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

// Full recompute is required because checker checks can depend on files outside the edit set.
export const signalUpdates =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <E, R>(
    updates: Stream.Stream<WorkspaceUpdate, E, R>
  ): Stream.Stream<ReadonlyArray<WiringSignals>, E, R> =>
    pipe(
      updates,
      Stream.mapEffect((update) => workspaceSignals(config)(update.rootPath)(update.contexts))
    )

// Match state participates because a newly matched or removed glob scope must reach derivation.
export const signalsEquivalence = (
  a: ReadonlyArray<WiringSignals>,
  b: ReadonlyArray<WiringSignals>
): boolean => wiringSignalsArrayEquivalence(a, b)

// Derivation stays per wiring because each glob assignment is an independent policy boundary.
export const reportBlockUpdates =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <E, R>(
    signals: Stream.Stream<ReadonlyArray<WiringSignals>, E, R>
  ): Stream.Stream<ReadonlyArray<ReportBlock>, E | DeriveError, R> =>
    pipe(signals, Stream.mapEffect(batchReportBlocks(config)))

const emptyReportText = (event: EmptyReportEvent): string => `No signals in ${event.rootPath}.`

// Kept separate from NDJSON because --pretty needs a human-readable projection of the same events.
export const renderEventText = (event: ReportEvent): string =>
  pipe(
    Match.value(event),
    Match.tag("signal", Struct.get<SignalEvent, "text">("text")),
    Match.tag("cleared", Struct.get<ClearedEvent, "text">("text")),
    Match.tag("empty", emptyReportText),
    Match.exhaustive
  )

// Clearances precede signals because consumers must retire stale blocks before replacements.
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

// Quiet batches stay silent because watch output should only surface real block changes.
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

// Linear gated stages are required because each stage drops unchanged values inside one batch.
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
