import { Array, Effect, Option, pipe } from "effect"
import * as path from "node:path"
import * as ts from "typescript"

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
