import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Function, Option, Stream, pipe } from "effect"
import * as ts from "typescript"
import type { Check } from "@better-typescript/core/engine/check/data"
import { detection, nodeCheck } from "@better-typescript/core/engine/check"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import {
  exampleSnippet,
  inlineRefactorExamples,
  refactorExample
} from "@better-typescript/core/engine/example"
import type { ExampleLoadError } from "@better-typescript/core/engine/example/data"
import { Detection, Location } from "@better-typescript/core/engine/location/data"
import type { ReportEvent } from "@better-typescript/core/engine/report/data"
import { contextFor } from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { makeReportEvents, workspaceUpdates } from "@better-typescript/core/engine/watch"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { defineConfig, makeWiring, namedCheck } from "@better-typescript/core/engine/wiring"
import { discoverWorkspace } from "@better-typescript/core/project/loadProject"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const noThrowFixturePath = path.join(testDirectory, "fixtures", "no-throw")
const syntheticRoot = path.resolve("/synthetic-report-events")
const syntheticFilePath = path.join(syntheticRoot, "src", "cases.ts")
const probeName = "probe throw statements"
const probeMessage = "throw statement"
const probeHint = "yield typed errors instead of throwing"

const probeExamples = inlineRefactorExamples([
  refactorExample(
    exampleSnippet("src/cases.ts", `throw new Error("boom")`),
    exampleSnippet("src/cases.ts", "yield* new BoomError()")
  )
])

const throwProbeCheck: Check = nodeCheck([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(
  (context) => (node) => [
    detection(context)({
      node,
      message: probeMessage,
      hint: probeHint
    })
  ]
)

const probeWiring = makeWiring({
  checks: [namedCheck(probeName, throwProbeCheck, probeExamples)],
  derive: (signals) => {
    const detectionCount = signals[0]?.detections.length ?? 0
    const advice: Advice = {
      location: new Location({ path: "src/cases.ts", line: 1, column: 1 }),
      level: "file",
      title: "probe advice",
      remediation: `handle ${detectionCount} throws`,
      evidence: [{ measure: "throw statements", count: detectionCount }],
      examples: probeExamples
    }

    return Stream.succeed(advice)
  }
})

const probeConfig = defineConfig([{ files: ["src/cases.ts"], wiring: probeWiring }])

const reportEvents =
  (config: typeof probeConfig) =>
  <UpdateError, R>(
    updates: Stream.Stream<WorkspaceUpdate, UpdateError, R>
  ): Stream.Stream<ReportEvent, UpdateError | ExampleLoadError, R> =>
    Stream.unwrap(
      pipe(
        makeReportEvents(config),
        Effect.map((report) => report(updates))
      )
    )

const contextFromSource = (sourceText: string): ProgramContext => {
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    noLib: true,
    target: ts.ScriptTarget.ESNext
  }
  const sourceFile = ts.createSourceFile(
    syntheticFilePath,
    sourceText,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  )
  const host = ts.createCompilerHost(compilerOptions)

  host.fileExists = (candidatePath) => candidatePath === syntheticFilePath
  host.readFile = (candidatePath) => (candidatePath === syntheticFilePath ? sourceText : undefined)
  host.getSourceFile = (candidatePath) =>
    candidatePath === syntheticFilePath ? sourceFile : undefined
  host.getCurrentDirectory = Function.constant(syntheticRoot)

  const program = ts.createProgram({
    rootNames: [syntheticFilePath],
    options: compilerOptions,
    host
  })

  return contextFor(syntheticRoot)(program)
}

const syntheticUpdate = (sourceText: string): WorkspaceUpdate =>
  new WorkspaceUpdate({
    rootPath: syntheticRoot,
    contexts: [contextFromSource(sourceText)]
  })

const collectStream = <A, E>(stream: Stream.Stream<A, E>): Promise<ReadonlyArray<A>> =>
  Effect.runPromise(Stream.runCollect(stream))

const initialSource = `throw "first"\n`
const movedSource = `\nthrow "first"\n`
const clearedSource = `export const value = 1\n`

const pollingWatchOptions: ts.WatchOptions = {
  watchFile: ts.WatchFileKind.FixedPollingInterval,
  watchDirectory: ts.WatchDirectoryKind.FixedPollingInterval,
  fallbackPolling: ts.PollingWatchKind.FixedInterval
}

test("reportEvents emits the initial advice and check blocks in report order", async () => {
  const events = await collectStream(
    reportEvents(probeConfig)(Stream.succeed(syntheticUpdate(initialSource)))
  )
  const [adviceEvent, checkEvent] = events

  assert.ok(adviceEvent?._tag === "signal")
  assert.equal(adviceEvent.key._tag, "advice")
  assert.match(adviceEvent.text, /^src\/cases\.ts \[file\] — probe advice/)

  assert.ok(checkEvent?._tag === "signal")
  assert.equal(checkEvent.key._tag, "rule")
  assert.equal(checkEvent.key.name, probeName)
  assert.match(checkEvent.text, /src\/cases\.ts:1:1/)
})

test("reportEvents suppresses identical batches and re-emits a changed block", async () => {
  const events = await collectStream(
    reportEvents(probeConfig)(
      Stream.fromIterable([
        syntheticUpdate(initialSource),
        syntheticUpdate(initialSource),
        syntheticUpdate(movedSource)
      ])
    )
  )

  assert.equal(events.length, 3, "expected two initial blocks and one changed block")

  const changed = events[2]

  assert.ok(changed?._tag === "signal")
  assert.equal(changed.key._tag, "rule")
  assert.match(changed.text, /src\/cases\.ts:2:1/)
})

test("reportEvents clears removed blocks before emitting changed blocks", async () => {
  const events = await collectStream(
    reportEvents(probeConfig)(
      Stream.fromIterable([syntheticUpdate(initialSource), syntheticUpdate(clearedSource)])
    )
  )
  const delta = events.slice(2)
  const [cleared, changedAdvice] = delta

  assert.equal(delta.length, 2)
  assert.ok(cleared?._tag === "cleared")
  assert.equal(cleared.key._tag, "rule")
  assert.equal(cleared.key.name, probeName)
  assert.equal(cleared.text, `${probeName} — cleared: ${probeMessage}`)

  assert.ok(changedAdvice?._tag === "signal")
  assert.equal(changedAdvice.key._tag, "advice")
  assert.match(changedAdvice.text, /handle 0 throws/)
})

test("reportEvents emits one root-scoped empty event for an empty initial report", async () => {
  const unmatchedConfig = defineConfig([{ files: ["missing.ts"], wiring: probeWiring }])
  const events = await collectStream(
    reportEvents(unmatchedConfig)(Stream.succeed(syntheticUpdate(initialSource)))
  )

  assert.equal(events.length, 1)
  assert.ok(events[0]?._tag === "empty")
  assert.equal(events[0].rootPath, syntheticRoot)
})

test("reportEvents preserves the workspace-update error channel", async () => {
  const failure = "workspace update failure" as const
  const output: Stream.Stream<ReportEvent, typeof failure | ExampleLoadError> = reportEvents(
    probeConfig
  )(Stream.fail(failure))
  const actual = await Effect.runPromise(pipe(output, Stream.runCollect, Effect.flip))

  assert.equal(actual, failure)
})

test("workspaceUpdates emits an initial and edited batch, then closes its file watchers", async () => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-updates-"))
  const casesPath = path.join(tempDirectory, "src", "cases.ts")
  const originalWatchFile = ts.sys.watchFile
  let closedWatchers = 0

  if (originalWatchFile === undefined) {
    assert.fail("TypeScript system must expose watchFile for the producer smoke test")
  }

  ts.sys.watchFile = (fileName, callback, pollingInterval, options) => {
    const watcher = originalWatchFile(fileName, callback, pollingInterval, options)

    return {
      close: () => {
        closedWatchers += 1
        watcher.close()
      }
    }
  }

  try {
    await fs.cp(noThrowFixturePath, tempDirectory, { recursive: true })

    const workspace = await Effect.runPromise(discoverWorkspace(tempDirectory))
    let observedBatches = 0

    const batches = await Effect.runPromise(
      pipe(
        workspaceUpdates(workspace, Option.some(pollingWatchOptions)),
        Stream.tap(() => {
          observedBatches += 1

          if (observedBatches === 1) {
            return Effect.promise(() =>
              fs.appendFile(casesPath, "\nexport const producerEdit = true\n")
            )
          }

          return Effect.void
        }),
        Stream.take(2),
        Stream.runCollect,
        Effect.timeout("30 seconds")
      )
    )

    assert.equal(batches.length, 2)
    assert.equal(batches[0]?.rootPath, workspace.rootPath)
    assert.equal(batches[1]?.rootPath, workspace.rootPath)

    const firstContext = batches[0]?.contexts[0]
    const editedContext = batches[1]?.contexts[0]

    assert.ok(firstContext, "expected the initial workspace context")
    assert.ok(editedContext, "expected the edited workspace context")

    const firstSourceFile = firstContext.program.getSourceFile(casesPath)
    const editedSourceFile = editedContext.program.getSourceFile(casesPath)

    assert.ok(firstSourceFile, "expected the initial source file")
    assert.ok(editedSourceFile, "expected the edited source file")
    assert.doesNotMatch(firstSourceFile.text, /producerEdit/)
    assert.match(editedSourceFile.text, /producerEdit/)
    assert.ok(closedWatchers > 0, "expected Stream.take completion to close TypeScript watchers")
  } finally {
    ts.sys.watchFile = originalWatchFile
    await fs.rm(tempDirectory, { recursive: true, force: true })
  }
})
