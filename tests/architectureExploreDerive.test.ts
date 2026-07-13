import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Chunk, Effect, Stream } from "effect"
import {
  architectureExploreChecks,
  architectureExploreDerive,
  architectureExploreWiring
} from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  ImportCallGraphData,
  PassThroughWrapperData,
  WideThinExportData
} from "@better-typescript/checks/architectureExplore/data"
import { Detection } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/report/data"
import { makeWiring } from "@better-typescript/core/engine/report"

const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)

const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  new Detection({
    location: new Location({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

const silentSignal = (
  name: string,
  detections: ReadonlyArray<Detection>
): Signal => new Signal({ name, reported: false, detections, examples: [] })

const reportedSignal = (
  name: string,
  detections: ReadonlyArray<Detection>
): Signal => new Signal({ name, reported: true, detections, examples: [] })

const collectAdvice = (
  advice: Stream.Stream<Advice, Error>
): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(
    Effect.map(Stream.runCollect(advice), Chunk.toReadonlyArray)
  )

const adviceWithTitle = (
  advice: ReadonlyArray<Advice>,
  title: string
): ReadonlyArray<Advice> => advice.filter((item) => item.title === title)

const adviceCount = (advice: ReadonlyArray<Advice>, title: string): number =>
  adviceWithTitle(advice, title).length

test("architectureExploreWiring is makeWiring-valid with unique check names", () => {
  const names = architectureExploreChecks.map((check) => check.name)
  const uniqueNames = new Set(names)

  assert.equal(names.length, uniqueNames.size)
  assert.deepEqual(names, [
    "pass-through-wrappers",
    "wide-thin-exports",
    "import-call-graph",
    "single-use-pure-export",
    "seam-leakage-evidence",
    "hardwired-dependencies"
  ])

  const wiring = makeWiring(architectureExploreWiring)
  assert.equal(wiring.checks.length, 6)
})

test("architectureExploreDerive emits deletion-test shallowness for thin wrappers", async () => {
  const path = "src/thin.ts"

  const wrappers = [
    detectionAt(
      path,
      1,
      new PassThroughWrapperData({ kind: "reexport", exportCount: 1 })
    )
  ]

  const wideThin = [
    detectionAt(
      path,
      2,
      new WideThinExportData({ exportCount: 5, statementCount: 5 })
    )
  ]

  const graphs = [
    detectionAt(
      path,
      3,
      new ImportCallGraphData({
        importCount: 2,
        outgoingCallCount: 1,
        importedPaths: ["./math.js", "./other.js"]
      })
    )
  ]

  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("pass-through-wrappers", wrappers),
      silentSignal("wide-thin-exports", wideThin),
      silentSignal("import-call-graph", graphs)
    ])
  )

  const shallowness = adviceWithTitle(advice, "deletion-test shallowness")

  assert.equal(adviceCount(advice, "deletion-test shallowness"), 1)
  assert.equal(shallowness[0]?.location.path, path)
  assert.equal(shallowness[0]?.level, "file")
  assert.deepEqual(
    shallowness[0]?.evidence.map((item) => item.measure),
    ["pass-through-wrappers", "wide-thin-exports", "import-call-graph"]
  )
})

test("architectureExploreDerive does not emit shallowness for wrappers with only import-call-graph", async () => {
  const path = "src/thin.ts"

  const wrappers = [
    detectionAt(
      path,
      1,
      new PassThroughWrapperData({ kind: "reexport", exportCount: 1 })
    )
  ]

  const graphs = [
    detectionAt(
      path,
      2,
      new ImportCallGraphData({
        importCount: 2,
        outgoingCallCount: 1,
        importedPaths: ["./math.js", "./other.js"]
      })
    )
  ]

  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("pass-through-wrappers", wrappers),
      silentSignal("import-call-graph", graphs)
    ])
  )

  assert.equal(adviceCount(advice, "deletion-test shallowness"), 0)
})

test("architectureExploreDerive emits bounce cluster for thin module directories", async () => {
  const wrappers = [
    detectionAt("src/cluster/one.ts", 1),
    detectionAt("src/cluster/two.ts", 1),
    detectionAt("src/cluster/three.ts", 1)
  ]

  const advice = await collectAdvice(
    architectureExploreDerive([silentSignal("pass-through-wrappers", wrappers)])
  )

  const bounce = adviceWithTitle(advice, "bounce cluster")

  assert.equal(adviceCount(advice, "bounce cluster"), 1)
  assert.equal(bounce[0]?.location.path, "src/cluster")
  assert.equal(bounce[0]?.level, "directory")
  assert.equal(bounce[0]?.evidence[0]?.measure, "thin-modules")
  assert.equal(bounce[0]?.evidence[0]?.count, 3)
})

test("architectureExploreDerive emits hard-to-test hotspot on concentrated hardwiring", async () => {
  const hardwired = range(2).map((line) => detectionAt("src/service.ts", line))

  const advice = await collectAdvice(
    architectureExploreDerive([
      reportedSignal("hardwired-dependencies", hardwired)
    ])
  )

  const hotspot = adviceWithTitle(advice, "hard-to-test hotspot")

  assert.equal(adviceCount(advice, "hard-to-test hotspot"), 1)
  assert.equal(hotspot[0]?.location.path, "src/service.ts")
  assert.deepEqual(
    hotspot[0]?.evidence.map((item) => item.measure),
    ["hardwired-dependencies"]
  )
})

test("architectureExploreDerive stays quiet below shallowness and bounce thresholds", async () => {
  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("pass-through-wrappers", [detectionAt("src/only.ts", 1)]),
      reportedSignal("hardwired-dependencies", [
        detectionAt("src/service.ts", 1)
      ])
    ])
  )

  assert.equal(adviceCount(advice, "deletion-test shallowness"), 0)
  assert.equal(adviceCount(advice, "bounce cluster"), 0)
  assert.equal(adviceCount(advice, "hard-to-test hotspot"), 0)
  assert.deepEqual(advice, [])
})
