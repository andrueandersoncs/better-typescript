import { Array, Effect, Function, Option, pipe } from "effect"
import * as path from "node:path"
import * as ts from "typescript"
import { makeRefactorExampleResolver, type ResolveRefactorExamples } from "../example/example.js"
import { batchReportBlocks, initialReportEvents } from "../report/report.js"
import type { WiringConfig } from "../wiring/data.js"
import { workspaceSignalsForProjects } from "../wiring/collect.js"
import { WorkspaceUpdate } from "./data.js"

const resolveExamples = Effect.fn("Watch.resolveExamples")(makeRefactorExampleResolver)

const reportEventsForResolver = (config: WiringConfig) => (update: WorkspaceUpdate) =>
  Effect.fn("Watch.reportEventsForResolver")(function* (resolve: ResolveRefactorExamples) {
    const signals = yield* workspaceSignalsForProjects(config)(update.rootPath)(update.contexts)(
      Function.identity
    )

    const blocks = yield* batchReportBlocks(config)(resolve)(signals)

    return initialReportEvents(update.rootPath)(blocks)
  })

const resolveDirectoryPath = (rootPath: string) => (directoryName: string) =>
  path.join(rootPath, directoryName)

const watchDirectories = (rootPath: string): ReadonlyArray<string> =>
  pipe(
    ts.sys.getDirectories(rootPath),
    Array.map(resolveDirectoryPath(rootPath)),
    Array.flatMap(watchDirectories),
    Array.prepend(rootPath)
  )

const releaseWatcher: (watcher: ts.FileWatcher) => void = (watcher) => watcher.close()

const watchDirectoryPath =
  (
    watchDirectory: NonNullable<typeof ts.sys.watchDirectory>,
    publishChange: ts.DirectoryWatcherCallback
  ) =>
  (directoryPath: string) =>
    watchDirectory(directoryPath, publishChange, false)

const filePollingIntervalMs = 250

const watchFilePath =
  (watchFile: NonNullable<typeof ts.sys.watchFile>, publishChange: ts.DirectoryWatcherCallback) =>
  (filePath: string) =>
    watchFile(filePath, publishChange, filePollingIntervalMs, {
      watchFile: ts.WatchFileKind.FixedPollingInterval
    })

// Watch files separately because Bun's recursive directory events can omit nested edits.
const publishRootPathWatch = (rootPath: string): Effect.Effect<void> =>
  Effect.callback<void, never, never>((resume) => {
    const maybeWatchDirectory = Option.fromNullishOr(ts.sys.watchDirectory)
    const maybeWatchFile = Option.fromNullishOr(ts.sys.watchFile)

    if (Option.isNone(maybeWatchDirectory)) {
      return
    }

    if (Option.isNone(maybeWatchFile)) {
      return Effect.void
    }

    const publishChange: ts.DirectoryWatcherCallback = () => {
      pipe(watchers, Array.forEach(releaseWatcher))
      resume(Effect.void)
    }

    const directoryWatchers = pipe(
      watchDirectories(rootPath),
      Array.map(watchDirectoryPath(maybeWatchDirectory.value, publishChange))
    )

    const fileWatchers = pipe(
      ts.sys.readDirectory(rootPath),
      Array.map(watchFilePath(maybeWatchFile.value, publishChange))
    )

    const watchers = Array.appendAll(directoryWatchers, fileWatchers)

    return Effect.sync(() => pipe(watchers, Array.forEach(releaseWatcher)))
  })

export const watchWorkspace = Effect.fn("Watch.watchWorkspace")(publishRootPathWatch)

// One update is complete because watch rebuilds a whole snapshot.
export const reportEvents = (config: WiringConfig) =>
  Effect.fn("Watch.reportEvents")(function* (update: WorkspaceUpdate) {
    return yield* pipe(resolveExamples(), Effect.flatMap(reportEventsForResolver(config)(update)))
  })
