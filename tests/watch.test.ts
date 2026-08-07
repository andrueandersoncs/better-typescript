import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "bun:test"
import { Deferred, Effect, Fiber, pipe } from "effect"
import * as ts from "typescript"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { watchWorkspace } from "@better-typescript/core/engine/watch/watch"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { discoverWorkspace } from "@better-typescript/core/project/loadProject"
import { workspacePrograms } from "@better-typescript/core/engine/watch/workspacePrograms"
import { aliasConfig } from "./watchAliasConfig.js"
import { aliasSource } from "./watchAliasSource.js"
import { clearedSource } from "./watchClearedSource.js"
import { initialSource } from "./watchInitialSource.js"
import { movedSource } from "./watchMovedSource.js"
import { noThrowFixturePath } from "./watchNoThrowFixturePath.js"
import { probeConfig } from "./watchProbeConfig.js"
import { probeName } from "./watchProbeName.js"
import { syntheticUpdate } from "./watchSyntheticContext.js"
import { syntheticRoot } from "./watchSyntheticRoot.js"
import { probeWiring } from "./watchThrowProbeWiring.js"
import { unusedCompilerOptions } from "./watchUnusedCompilerOptions.js"

test("reportEvents preserves the no-value-aliases watch identity", async () => {
  const events = await Effect.runPromise(reportEvents(aliasConfig)(syntheticUpdate(aliasSource)))
  const event = events[0]

  assert.equal(events.length, 1)
  assert.ok(event?._tag === "signal")
  assert.equal(event.key._tag, "rule")
  assert.equal(event.key.name, "no-value-aliases")
  assert.match(event.text, /Do not declare aliases for existing values\./)
  assert.match(event.text, /src\/cases\.ts:2:7/)
  assert.doesNotMatch(event.text, /no-export-aliases/)
})

test("reportEvents emits the initial advice and check blocks in report order", async () => {
  const events = await Effect.runPromise(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
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
  const first = await Effect.runPromise(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
  const second = await Effect.runPromise(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
  const moved = await Effect.runPromise(reportEvents(probeConfig)(syntheticUpdate(movedSource)))

  assert.equal(first.length, 2, "expected advice and check blocks on the first snapshot")
  assert.equal(second.length, 2, "expected a full snapshot again for an identical update")
  assert.equal(moved.length, 2, "expected a full snapshot after the throw moves")

  const changed = moved[1]

  assert.ok(changed?._tag === "signal")
  assert.equal(changed.key._tag, "rule")
  assert.match(changed.text, /src\/cases\.ts:2:1/)
})

test("reportEvents emits a full empty snapshot when detections disappear", async () => {
  const initial = await Effect.runPromise(reportEvents(probeConfig)(syntheticUpdate(initialSource)))
  const cleared = await Effect.runPromise(reportEvents(probeConfig)(syntheticUpdate(clearedSource)))

  assert.equal(initial.length, 2)
  assert.equal(cleared.length, 1)
  assert.ok(cleared[0]?._tag === "empty")
  assert.equal(cleared[0].rootPath, syntheticRoot)
})

test("reportEvents emits one root-scoped empty event for an empty initial report", async () => {
  const unmatchedConfig = defineConfig([{ files: ["missing.ts"], wiring: probeWiring }])
  const events = await Effect.runPromise(
    reportEvents(unmatchedConfig)(syntheticUpdate(initialSource))
  )

  assert.equal(events.length, 1)
  assert.ok(events[0]?._tag === "empty")
  assert.equal(events[0].rootPath, syntheticRoot)
})

test("watchWorkspace waits for a change and closes its file watchers", async () => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-watcher-"))
  const casesPath = path.join(tempDirectory, "src", "cases.ts")
  const originalWatchDirectory = ts.sys.watchDirectory
  const originalWatchFile = ts.sys.watchFile
  let closedWatchers = 0
  const watcherReady = Deferred.makeUnsafe<void>()

  if (originalWatchDirectory === undefined) {
    assert.fail("TypeScript system must expose watchDirectory for the watcher smoke test")
  }
  if (originalWatchFile === undefined) {
    assert.fail("TypeScript system must expose watchFile for the watcher smoke test")
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
  ts.sys.watchFile = (fileName, callback, pollingInterval, options) => {
    const watcher = originalWatchFile(fileName, callback, pollingInterval, options)

    if (fileName === casesPath) {
      Effect.runSync(Deferred.succeed(watcherReady, undefined))
    }

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
    const firstEvents = await Effect.runPromise(reportEvents(probeConfig)(firstUpdate))

    assert.ok(firstEvents.some((event) => event._tag === "signal"))

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fiber = yield* Effect.forkScoped(watchWorkspace(tempDirectory))

          yield* Deferred.await(watcherReady)
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
    const secondEvents = await Effect.runPromise(reportEvents(probeConfig)(secondUpdate))

    assert.ok(secondEvents.some((event) => event._tag === "signal"))
    assert.ok(
      closedWatchers > 0,
      "expected watchWorkspace finalization to close TypeScript watchers"
    )
  } finally {
    ts.sys.watchDirectory = originalWatchDirectory
    ts.sys.watchFile = originalWatchFile
    await fs.rm(tempDirectory, { recursive: true, force: true })
  }
})
