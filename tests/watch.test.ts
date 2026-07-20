import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Fiber, Function, pipe } from "effect"
import * as ts from "typescript"
import type { Check } from "@better-typescript/core/engine/check/data"
import { makeDetection, nodeCheck } from "@better-typescript/core/engine/check"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeExampleSnippet,
  makeInlineRefactorExamples,
  makeRefactorExample
} from "./exampleHelpers.js"
import { Location } from "@better-typescript/core/engine/location/data"
import type { ReportEvent } from "@better-typescript/core/engine/report/data"
import { makeContext } from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { reportEvents, watchWorkspace } from "@better-typescript/core/engine/watch"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { defineConfig, makeWiring, makeNamedCheck } from "@better-typescript/core/engine/wiring"
import { discoverWorkspace } from "@better-typescript/core/project/loadProject"
import { workspacePrograms } from "@better-typescript/core/engine/workspacePrograms"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const noThrowFixturePath = path.join(testDirectory, "fixtures", "no-throw")
const syntheticRoot = path.resolve("/synthetic-report-events")
const syntheticFilePath = path.join(syntheticRoot, "src", "cases.ts")
const probeName = "probe throw statements"
const probeMessage = "throw statement"
const probeHint = "yield typed errors instead of throwing"

const probeExamples = makeInlineRefactorExamples([
  makeRefactorExample(
    makeExampleSnippet("src/cases.ts", `throw new Error("boom")`),
    makeExampleSnippet("src/cases.ts", "yield* new BoomError()")
  )
])

const throwProbeCheck: Check = nodeCheck([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(
  (context) => (node) => [
    makeDetection(context)({
      node,
      message: probeMessage,
      hint: probeHint
    })
  ]
)

const probeWiring = makeWiring({
  checks: [makeNamedCheck(probeName, throwProbeCheck, probeExamples)],
  derive: (signals) => {
    const detectionCount = signals[0]?.detections.length ?? 0

    if (detectionCount === 0) {
      return []
    }
    const advice: Advice = {
      location: Location.make({ path: "src/cases.ts", line: 1, column: 1 }),
      level: "file",
      title: "probe advice",
      remediation: `handle ${detectionCount} throws`,
      evidence: [{ measure: "throw statements", count: detectionCount }],
      examples: probeExamples
    }

    return [advice]
  }
})

const probeConfig = defineConfig([{ files: ["src/cases.ts"], wiring: probeWiring }])

const collectEvents = <E>(
  effect: Effect.Effect<ReadonlyArray<ReportEvent>, E>
): Promise<ReadonlyArray<ReportEvent>> => Effect.runPromise(effect)

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

  return makeContext(syntheticRoot)(program)
}

const syntheticUpdate = (sourceText: string): WorkspaceUpdate =>
  new WorkspaceUpdate({
    rootPath: syntheticRoot,
    contexts: [contextFromSource(sourceText)]
  })

const initialSource = `throw "first"\n`
const movedSource = `\nthrow "first"\n`
const clearedSource = `export const value = 1\n`

const unusedCompilerOptions: ts.CompilerOptions = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true
}

test("reportEvents emits the initial advice and check blocks in report order", async () => {
  const events = await collectEvents(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
  const [adviceEvent, checkEvent] = events

  assert.ok(adviceEvent?._tag === "signal")
  assert.equal(adviceEvent.key._tag, "advice")
  assert.match(adviceEvent.text, /^src\/cases\.ts \[file\] — probe advice/)

  assert.ok(checkEvent?._tag === "signal")
  assert.equal(checkEvent.key._tag, "rule")
  assert.equal(checkEvent.key.name, probeName)
  assert.match(checkEvent.text, /src\/cases\.ts:1:1/)
})

test("reportEvents returns a complete snapshot for every update without suppressing repeats", async () => {
  const first = await collectEvents(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
  const second = await collectEvents(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
  const moved = await collectEvents(reportEvents(probeConfig)(syntheticUpdate(movedSource)))

  assert.equal(first.length, 2, "expected advice and check blocks on the first snapshot")
  assert.equal(second.length, 2, "expected a full snapshot again for an identical update")
  assert.equal(moved.length, 2, "expected a full snapshot after the throw moves")

  const changed = moved[1]

  assert.ok(changed?._tag === "signal")
  assert.equal(changed.key._tag, "rule")
  assert.match(changed.text, /src\/cases\.ts:2:1/)
})

test("reportEvents emits a full empty snapshot when detections disappear", async () => {
  const initial = await collectEvents(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
  const cleared = await collectEvents(reportEvents(probeConfig)(syntheticUpdate(clearedSource)))

  assert.equal(initial.length, 2)
  assert.equal(cleared.length, 1)
  assert.ok(cleared[0]?._tag === "empty")
  assert.equal(cleared[0].rootPath, syntheticRoot)
})

test("reportEvents emits one root-scoped empty event for an empty initial report", async () => {
  const unmatchedConfig = defineConfig([{ files: ["missing.ts"], wiring: probeWiring }])
  const events = await collectEvents(reportEvents(unmatchedConfig)(syntheticUpdate(initialSource)))

  assert.equal(events.length, 1)
  assert.ok(events[0]?._tag === "empty")
  assert.equal(events[0].rootPath, syntheticRoot)
})

test("watchWorkspace waits for a change and closes its file watchers", async () => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-watcher-"))
  const casesPath = path.join(tempDirectory, "src", "cases.ts")
  const originalWatchDirectory = ts.sys.watchDirectory
  let closedWatchers = 0

  if (originalWatchDirectory === undefined) {
    assert.fail("TypeScript system must expose watchDirectory for the watcher smoke test")
  }

  ts.sys.watchDirectory = (directoryName, callback, recursive, options) => {
    const watcher = originalWatchDirectory(directoryName, callback, recursive, options)

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
    const firstUpdate = await Effect.runPromise(
      Effect.scoped(workspacePrograms.materialize(workspace, unusedCompilerOptions))
    )
    const firstEvents = await collectEvents(reportEvents(probeConfig)(firstUpdate))

    assert.ok(firstEvents.some((event) => event._tag === "signal"))

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fiber = yield* Effect.forkScoped(watchWorkspace(tempDirectory))

          yield* Effect.yieldNow
          yield* Effect.promise(() =>
            fs.appendFile(casesPath, "\nexport const producerEdit = true\n")
          )
          yield* pipe(Fiber.join(fiber), Effect.timeout("30 seconds"))
        })
      )
    )

    const secondUpdate = await Effect.runPromise(
      Effect.scoped(workspacePrograms.materialize(workspace, unusedCompilerOptions))
    )
    const secondEvents = await collectEvents(reportEvents(probeConfig)(secondUpdate))

    assert.ok(secondEvents.some((event) => event._tag === "signal"))
    assert.ok(
      closedWatchers > 0,
      "expected watchWorkspace finalization to close TypeScript watchers"
    )
  } finally {
    ts.sys.watchDirectory = originalWatchDirectory
    await fs.rm(tempDirectory, { recursive: true, force: true })
  }
})
