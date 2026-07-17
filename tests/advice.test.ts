import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Effect, Stream } from "effect"
import { defaultDerive } from "@better-typescript/checks/preset/defaultWiring"
import { Detection } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/signal/data"

const derive = await Effect.runPromise(defaultDerive)

const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  new Detection({
    location: new Location({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)

const detectionsAt = (path: string, count: number, data?: unknown): ReadonlyArray<Detection> =>
  range(count).map((line) => detectionAt(path, line, data))

const reportedSignal = (name: string, detections: ReadonlyArray<Detection>): Signal =>
  new Signal({ name, reported: true, detections, examples: [] })

const collectAdvice = (advice: Stream.Stream<Advice>): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(Stream.runCollect(advice))

const adviceWithTitle = (advice: ReadonlyArray<Advice>, title: string): ReadonlyArray<Advice> =>
  advice.filter((item) => item.title === title)

const adviceTitles = (advice: ReadonlyArray<Advice>): ReadonlyArray<string> =>
  advice.map((item) => item.title)

const evidenceMeasures = (advice: Advice): ReadonlyArray<string> =>
  advice.evidence.map((item) => item.measure)

test("imperativeStateManager fires on shared-state mutation density", async () => {
  const mutations = detectionsAt("src/state/manager.ts", 10, { target: "shared-state" })
  const hashMapSignals = [
    detectionAt("src/state/manager.ts", 20),
    detectionAt("src/state/manager.ts", 21)
  ]
  const advice = await collectAdvice(
    derive([
      reportedSignal("no-mutation", mutations),
      reportedSignal("prefer-hash-map", hashMapSignals)
    ])
  )
  const imperative = adviceWithTitle(advice, "imperative state manager")

  assert.deepEqual(adviceTitles(imperative), ["imperative state manager"])
  assert.equal(imperative[0]?.location.path, "src/state/manager.ts")
  assert.equal(imperative[0]?.level, "file")
  assert.deepEqual(evidenceMeasures(imperative[0]!), [
    "no-mutation/shared-state",
    "no-mutation",
    "prefer-hash-map"
  ])
  assert.ok(imperative[0]!.examples.length > 0)
})

test("imperativeStateManager ignores local mutations and below-threshold shared mutations", async () => {
  const localMutations = detectionsAt("src/fold.ts", 10, { target: "local" })
  const fewSharedMutations = detectionsAt("src/state/manager.ts", 7, { target: "shared-state" })

  assert.deepEqual(
    adviceWithTitle(
      await collectAdvice(derive([reportedSignal("no-mutation", localMutations)])),
      "imperative state manager"
    ),
    []
  )
  assert.deepEqual(
    adviceWithTitle(
      await collectAdvice(derive([reportedSignal("no-mutation", fewSharedMutations)])),
      "imperative state manager"
    ),
    []
  )
})

test("highSignalDensity reports dense files with total and per-rule evidence", async () => {
  const noThrowSignals = detectionsAt("src/hot.ts", 10)
  const advice = await collectAdvice(derive([reportedSignal("no-throw", noThrowSignals)]))
  const density = adviceWithTitle(advice, "high signal density")

  assert.deepEqual(adviceTitles(density), ["high signal density"])
  assert.equal(density[0]?.location.path, "src/hot.ts")
  assert.deepEqual(evidenceMeasures(density[0]!), ["signals", "no-throw"])
  assert.equal(density[0]?.evidence[1]?.count, 10)
  assert.ok(density[0]!.examples.length > 0)
})

test("sideEffectLaundering fires on repeated same-line collisions between distinct rules", async () => {
  const advice = await collectAdvice(
    derive([
      reportedSignal("no-mutation", [
        detectionAt("src/useRun.ts", 153),
        detectionAt("src/useRun.ts", 180)
      ]),
      reportedSignal("no-void-functions", [
        detectionAt("src/useRun.ts", 153),
        detectionAt("src/useRun.ts", 180)
      ])
    ])
  )
  const laundering = adviceWithTitle(advice, "colliding fixes on shared expressions")

  assert.deepEqual(adviceTitles(laundering), ["colliding fixes on shared expressions"])
  assert.deepEqual(evidenceMeasures(laundering[0]!), [
    "line 153: no-mutation + no-void-functions",
    "line 180: no-mutation + no-void-functions"
  ])
  assert.ok(laundering[0]!.examples.length > 0)
})

test("sideEffectLaundering stays quiet for a single colliding line", async () => {
  const advice = await collectAdvice(
    derive([
      reportedSignal("no-mutation", [detectionAt("src/useRun.ts", 153)]),
      reportedSignal("no-void-functions", [detectionAt("src/useRun.ts", 153)])
    ])
  )

  assert.deepEqual(adviceWithTitle(advice, "colliding fixes on shared expressions"), [])
})

test("pipelineHostile combines nested-call and uncurried-helper signals", async () => {
  const nested = detectionsAt("src/fold.ts", 5)
  const uncurried = range(5).map((line) => detectionAt("src/fold.ts", line + 10))
  const advice = await collectAdvice(
    derive([
      reportedSignal("no-nested-calls", nested),
      reportedSignal("prefer-curried-data-last-functions", uncurried)
    ])
  )
  const pipeline = adviceWithTitle(advice, "pipeline-hostile module")

  assert.deepEqual(adviceTitles(pipeline), ["pipeline-hostile module"])
  assert.deepEqual(evidenceMeasures(pipeline[0]!), [
    "no-nested-calls",
    "prefer-curried-data-last-functions"
  ])
  assert.ok(pipeline[0]!.examples.length > 0)
})

test("ruleDominance fires at project level for a widespread dominant rule", async () => {
  const dominant = range(25).map((line) => detectionAt(`pkg${line % 5}/src/file.ts`, line))
  const rest = detectionsAt("other/other.ts", 5)
  const advice = await collectAdvice(
    derive([reportedSignal("no-throw", dominant), reportedSignal("no-mutation", rest)])
  )
  const dominance = adviceWithTitle(advice, "one rule dominates the run")

  assert.deepEqual(adviceTitles(dominance), ["one rule dominates the run"])
  assert.equal(dominance[0]?.level, "project")
  assert.deepEqual(evidenceMeasures(dominance[0]!), ["signals", "no-throw"])
  assert.equal(dominance[0]?.evidence[1]?.count, 25)
  assert.ok(dominance[0]!.examples.length > 0)
})

test("hotSubsystem reports the deepest qualifying directory", async () => {
  const subsystem = range(27).map((line) => detectionAt(`src/mcp/file${line % 3}.ts`, line))
  const elsewhere = detectionsAt("web/useRun.ts", 3)
  const advice = await collectAdvice(
    derive([reportedSignal("no-throw", subsystem), reportedSignal("no-mutation", elsewhere)])
  )
  const hot = adviceWithTitle(advice, "hot subsystem")

  assert.deepEqual(
    hot.map((item) => item.location.path),
    ["src/mcp"]
  )
  assert.deepEqual(adviceTitles(hot), ["hot subsystem"])
  assert.ok(hot[0]!.examples.length > 0)
})

test("systemicHotspots fires only when subsystem and dense-file advice are both present", async () => {
  const mcpPaths = ["src/mcp/file0.ts", "src/mcp/file1.ts", "src/mcp/file2.ts", "src/mcp/file3.ts"]
  const subsystemOnly = mcpPaths.flatMap((path) => detectionsAt(path, 8))
  const oneDense = detectionsAt("src/one.ts", 10)
  const twoDense = [...detectionsAt("src/one.ts", 10), ...detectionsAt("src/two.ts", 10)]

  const silentAdvice = await collectAdvice(
    derive([reportedSignal("no-throw", [...subsystemOnly, ...oneDense])])
  )
  assert.deepEqual(adviceWithTitle(silentAdvice, "systemic hotspots"), [])
  assert.equal(adviceWithTitle(silentAdvice, "hot subsystem").length, 1)
  assert.equal(adviceWithTitle(silentAdvice, "high signal density").length, 1)

  const advice = await collectAdvice(
    derive([reportedSignal("no-throw", [...subsystemOnly, ...twoDense])])
  )
  const systemic = adviceWithTitle(advice, "systemic hotspots")

  assert.deepEqual(adviceTitles(systemic), ["systemic hotspots"])
  assert.equal(systemic[0]?.level, "project")
  assert.deepEqual(evidenceMeasures(systemic[0]!), ["hot-subsystem", "high-signal-density"])
  assert.equal(systemic[0]?.evidence[0]?.count, 1)
  assert.equal(systemic[0]?.evidence[1]?.count, 2)
  assert.ok(systemic[0]!.examples.length > 0)
})
