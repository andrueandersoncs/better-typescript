import {
  Array,
  Effect,
  Function,
  HashMap,
  HashSet,
  Option,
  Queue,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import * as ts from "typescript"
import type { ProjectConfig, WorkspaceConfigs } from "../../project/loadProject/data.js"
import type { ReportBlock, ReportEvent } from "../report/data.js"
import {
  batchReportBlocks,
  blockClearedEvent,
  blockEntry,
  blockSignalEvent,
  initialReportEvents
} from "../report/report.js"
import type { WiringSignals } from "../signal/data.js"
import { wiringSignalsArrayEquivalence } from "../signal/signal.js"
import type { ProgramContext } from "../sources/data.js"
import { contextFor, isProjectSourceFile } from "../sources/sources.js"
import type { WiringConfig } from "../wiring/data.js"
import { workspaceSignals } from "../wiring/wiring.js"
import { SourceUpdate, WorkspaceUpdate } from "./data.js"

// Reporter diagnostics stay silent because the watcher must keep the last valid program on failure.
const ignoreDiagnostic = (_diagnostic: ts.Diagnostic): false => false

const stopWatch = (watch: ts.WatchOfConfigFile<ts.BuilderProgram>): Effect.Effect<void> =>
  Effect.sync(() => {
    watch.close()
  })

// Fresh contexts per rebuild are required because diffs and checks must observe the new program.
const programUpdates = (
  config: ProjectConfig,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<ProgramContext> =>
  Stream.callback<ProgramContext>((queue) => {
    const onProgramCreate = (builder: ts.BuilderProgram) => {
      const program = builder.getProgram()
      const context = contextFor(config.rootPath)(program)

      return Queue.offerUnsafe(queue, context)
    }

    const acquire = Effect.sync(() => {
      const watchOptionsToExtend = Option.getOrUndefined(watchOptions)

      const host = ts.createWatchCompilerHost(
        config.configPath,
        undefined,
        ts.sys,
        ts.createAbstractBuilder,
        ignoreDiagnostic,
        ignoreDiagnostic,
        watchOptionsToExtend
      )

      // Set afterProgramCreate after host build because createWatchProgram emits the initial program now.
      host.afterProgramCreate = onProgramCreate

      return ts.createWatchProgram(host)
    })

    return Effect.acquireRelease(acquire, stopWatch)
  })

const emptyFileIndex: HashMap.HashMap<string, ts.SourceFile> = HashMap.empty()

const fileIndexEntry = (sourceFile: ts.SourceFile): readonly [string, ts.SourceFile] =>
  Tuple.make(sourceFile.fileName, sourceFile)

// Over-reporting is acceptable because missing a changed file would leave stale detections.
const diffCheckableFiles =
  (previous: HashMap.HashMap<string, ts.SourceFile>) =>
  (context: ProgramContext): readonly [HashMap.HashMap<string, ts.SourceFile>, SourceUpdate] => {
    const allSourceFiles = context.program.getSourceFiles()
    const currentFiles = Array.filter(allSourceFiles, isProjectSourceFile)
    const entries = Array.map(currentFiles, fileIndexEntry)
    const next = HashMap.fromIterable(entries)

    const changed = Array.filter(currentFiles, (sourceFile) =>
      pipe(
        HashMap.get(previous, sourceFile.fileName),
        Option.match({
          onNone: Function.constant(true),
          onSome: (known) => known !== sourceFile
        })
      )
    )

    const removed = pipe(
      previous,
      HashMap.keys,
      Array.fromIterable,
      Array.filter((fileName) => !HashMap.has(next, fileName))
    )

    const update = new SourceUpdate({ context, changed, removed })

    return Tuple.make(next, update)
  }

// Changed and deleted paths emit together because workspace caching must drop removed files too.
const sourceUpdates = (
  config: ProjectConfig,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<SourceUpdate> =>
  pipe(
    programUpdates(config, watchOptions),
    Stream.mapAccum(Function.constant(emptyFileIndex), (previous, context) => {
      const [next, update] = diffCheckableFiles(previous)(context)
      const updates = Array.of(update)

      return Tuple.make(next, updates)
    })
  )

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

    const contexts = Array.makeBy(projectCount, (order) =>
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

// Match state participates because a newly matched or removed glob scope must reach derivation.
const signalsEquivalence = (
  a: readonly [rootPath: string, signals: ReadonlyArray<WiringSignals>],
  b: readonly [rootPath: string, signals: ReadonlyArray<WiringSignals>]
) => {
  const hasSameRootPath = a[0] === b[0]

  return hasSameRootPath && wiringSignalsArrayEquivalence(a[1], b[1])
}

// Derivation stays per wiring because each glob assignment is an independent policy boundary.
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

// Clearances precede signals because consumers must retire stale blocks before replacements.
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

// Quiet batches stay silent because watch output should only surface real block changes.
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

// Full recompute is required because checker checks can depend on files outside the edit set.
export const reportEvents =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <UpdateError, R>(
    updates: Stream.Stream<WorkspaceUpdate, UpdateError, R>
  ): Stream.Stream<ReportEvent, UpdateError | DeriveError, R> => {
    const recomputedSignals = pipe(updates, signalUpdates(config))
    const gatedSignals = pipe(recomputedSignals, Stream.changesWith(signalsEquivalence))

    return pipe(gatedSignals, reportBlockUpdates(config), blockDeltas)
  }
