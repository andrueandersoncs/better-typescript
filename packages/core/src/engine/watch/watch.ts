import { Effect, pipe } from "effect"
import * as ts from "typescript"
import { makeRefactorExampleResolver, type ResolveRefactorExamples } from "../example/example.js"
import { batchReportBlocks, initialReportEvents } from "../report/report.js"
import type { WiringConfig } from "../wiring/data.js"
import { collectWorkspaceSignals } from "../wiring/wiring.js"
import { WorkspaceUpdate } from "./data.js"

const resolveExamples = Effect.fn("Watch.resolveExamples")(makeRefactorExampleResolver)

const reportEventsForResolver =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  (update: WorkspaceUpdate) =>
  (resolve: ResolveRefactorExamples) =>
    Effect.gen(function* () {
      const signals = yield* collectWorkspaceSignals(config)(update.rootPath)(update.contexts)
      const blocks = yield* batchReportBlocks(config)(resolve)(signals)

      return initialReportEvents(update.rootPath)(blocks)
    })

// FIXME: I have a feeling it's possible to eliminate all callbacks, period. We should investigate a rule/check that can detect this automatically.
// One callback wait owns one native watcher because every change reruns a complete report.
export const watchWorkspace = Effect.fn("Watch.watchWorkspace")(
  (rootPath: string): Effect.Effect<void> =>
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
)

// One update is complete because watch rebuilds a whole snapshot.
export const reportEvents = <DeriveError>(config: WiringConfig<DeriveError>) =>
  // FIXME: we should investigate converting this to a more pointfree style - there should also be a check/rule that can detect this automatically
  Effect.fn("Watch.reportEvents")((update: WorkspaceUpdate) =>
    pipe(resolveExamples(), Effect.flatMap(reportEventsForResolver(config)(update)))
  )
