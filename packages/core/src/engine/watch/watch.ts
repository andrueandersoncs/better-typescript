import { Effect, Function, pipe } from "effect"
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

// One callback wait owns one native watcher because every change reruns a complete report.
const publishRootPathWatch = (rootPath: string): Effect.Effect<void> =>
  Effect.callback<void, never, never>((resume) => {
    const watchDirectory = ts.sys.watchDirectory

    if (!watchDirectory) {
      return
    }

    const watcher = watchDirectory(
      rootPath,
      () => {
        watcher.close()
        resume(Effect.void)
      },
      true
    )

    return Effect.sync(() => watcher.close())
  })

export const watchWorkspace = Effect.fn("Watch.watchWorkspace")(publishRootPathWatch)

// One update is complete because watch rebuilds a whole snapshot.
export const reportEvents = (config: WiringConfig) =>
  Effect.fn("Watch.reportEvents")(function* (update: WorkspaceUpdate) {
    return yield* pipe(resolveExamples(), Effect.flatMap(reportEventsForResolver(config)(update)))
  })
