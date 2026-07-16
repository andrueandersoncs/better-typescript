import {
  Array,
  Effect,
  Function,
  HashMap,
  HashSet,
  Option,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import type * as ts from "typescript"
import type { WorkspaceConfigs } from "../../project/loadProject/data.js"
import type { ReportBlock, ReportEvent } from "../report/data.js"
import {
  batchReportBlocks,
  blockClearedEvent,
  blockEntry,
  blockSignalEvent,
  initialReportEvents
} from "../report/report.js"
import type { WiringSignals } from "../signal/data.js"
import { wiringSignalsArrayEquivalence, workspaceSignals } from "../signal/signal.js"
import type { ProgramContext, SourceUpdate } from "../sources/data.js"
import { sourceUpdates } from "../sources/sources.js"
import type { WiringConfig } from "../wiring/data.js"
import { WorkspaceUpdate } from "./data.js"

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

const signalUpdates =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <UpdateError, R>(
    updates: Stream.Stream<WorkspaceUpdate, UpdateError, R>
  ): Stream.Stream<
    readonly [rootPath: string, signals: ReadonlyArray<WiringSignals>],
    UpdateError,
    R
  > =>
    pipe(
      updates,
      Stream.mapEffect((update) =>
        pipe(
          workspaceSignals(config)(update.rootPath)(update.contexts),
          Effect.map((signals) => Tuple.make(update.rootPath, signals))
        )
      )
    )

const signalsEquivalence = (
  a: readonly [rootPath: string, signals: ReadonlyArray<WiringSignals>],
  b: readonly [rootPath: string, signals: ReadonlyArray<WiringSignals>]
): boolean => {
  const hasSameRootPath = a[0] === b[0]

  return hasSameRootPath && wiringSignalsArrayEquivalence(a[1], b[1])
}

const reportBlockUpdates =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <UpdateError, R>(
    updates: Stream.Stream<
      readonly [rootPath: string, signals: ReadonlyArray<WiringSignals>],
      UpdateError,
      R
    >
  ): Stream.Stream<
    readonly [rootPath: string, blocks: ReadonlyArray<ReportBlock>],
    UpdateError | DeriveError,
    R
  > =>
    pipe(
      updates,
      Stream.mapEffect(([rootPath, signals]) =>
        pipe(
          batchReportBlocks(config)(signals),
          Effect.map((blocks) => Tuple.make(rootPath, blocks))
        )
      )
    )

const blockDelta =
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

const blockDeltas = <UpdateError, R>(
  updates: Stream.Stream<
    readonly [rootPath: string, blocks: ReadonlyArray<ReportBlock>],
    UpdateError,
    R
  >
): Stream.Stream<ReportEvent, UpdateError, R> =>
  pipe(
    updates,
    Stream.mapAccum(Function.constant(initialDeltaState), (previous, [rootPath, current]) => {
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
 * Recompute complete signals for each workspace update and emit only observable
 * report deltas.
 *
 * @remarks
 *   Full recomputation stays at this stream boundary because checks can depend on
 *   files outside the edited set through the TypeScript type graph.
 */
export const reportEvents =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <UpdateError, R>(
    updates: Stream.Stream<WorkspaceUpdate, UpdateError, R>
  ): Stream.Stream<ReportEvent, UpdateError | DeriveError, R> =>
    pipe(
      updates,
      signalUpdates(config),
      Stream.changesWith(signalsEquivalence),
      reportBlockUpdates(config),
      blockDeltas
    )
