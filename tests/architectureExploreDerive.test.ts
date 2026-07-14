import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Chunk, Effect, Stream } from "effect"
import {
  architectureExploreChecks,
  architectureExploreDerive,
  architectureExploreWiring
} from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  ExternalDependencyConstructionData,
  InterfaceBurdenData,
  ModuleGraphData,
  PassThroughWrapperData,
  SeamLeakageData,
  SingleAdapterSeamData,
  TestOnlyExportData
} from "@better-typescript/checks/architectureExplore/data"
import { Detection } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/report/data"
import { makeWiring } from "@better-typescript/core/engine/report"

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

const wrapperData = (
  callerCount: number,
  hasNonCallReference = false
): PassThroughWrapperData =>
  new PassThroughWrapperData({
    kind: "forwarding-call",
    exportCount: 1,
    callerCount,
    callerPaths: callerCount === 0 ? [] : ["src/caller.ts"],
    hasNonCallReference
  })

test("architectureExploreWiring contains only relational silent evidence checks", () => {
  const names = architectureExploreChecks.map((check) => check.name)

  assert.deepEqual(names, [
    "pass-through-wrappers",
    "interface-burden",
    "module-graph",
    "test-only-exports",
    "seam-leakage-evidence",
    "external-dependency-construction",
    "single-adapter-seams"
  ])
  assert.equal(new Set(names).size, names.length)
  assert.equal(
    architectureExploreChecks.every((check) => !check.reported),
    true
  )
  assert.equal(makeWiring(architectureExploreWiring).checks.length, 7)
})

test("deletion test removes low-leverage exact forwarders", async () => {
  const path = "src/thin.ts"
  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("pass-through-wrappers", [
        detectionAt(path, 1, wrapperData(1))
      ])
    ])
  )
  const deletion = adviceWithTitle(advice, "deletion-test shallowness")

  assert.equal(deletion.length, 1)
  assert.equal(deletion[0]?.location.path, path)
  assert.deepEqual(
    deletion[0]?.evidence.map((item) => item.measure),
    ["deletable-forwarders", "production-callers"]
  )
})

test("deletion test preserves caller leverage and non-call contracts", async () => {
  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("pass-through-wrappers", [
        detectionAt("src/many.ts", 1, wrapperData(2)),
        detectionAt("src/value.ts", 1, wrapperData(1, true))
      ])
    ])
  )

  assert.equal(adviceWithTitle(advice, "deletion-test shallowness").length, 0)
})

test("wide shallow interface requires a forwarding-dominated burden", async () => {
  const widePath = "src/client.ts"
  const deepPath = "src/deep.ts"
  const wideWrappers = [1, 2, 3].map((line) =>
    detectionAt(widePath, line, wrapperData(1))
  )
  const deepWrappers = [1, 2, 3].map((line) =>
    detectionAt(deepPath, line, wrapperData(1))
  )
  const wideBurden = detectionAt(
    widePath,
    1,
    new InterfaceBurdenData({
      operationCount: 4,
      requiredParameterCount: 6
    })
  )
  const deepBurden = detectionAt(
    deepPath,
    1,
    new InterfaceBurdenData({
      operationCount: 10,
      requiredParameterCount: 12
    })
  )
  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("pass-through-wrappers", [...wideWrappers, ...deepWrappers]),
      silentSignal("interface-burden", [wideBurden, deepBurden])
    ])
  )
  const wide = adviceWithTitle(advice, "wide shallow interface")

  assert.equal(wide.length, 1)
  assert.equal(wide[0]?.location.path, widePath)
})

test("bounce cluster requires connected shallow Modules", async () => {
  const wrappers = ["one", "two", "three"].map((name, index) =>
    detectionAt(`src/cluster/${name}.ts`, index + 1, wrapperData(1))
  )
  const graph = [
    detectionAt(
      "src/cluster/one.ts",
      1,
      new ModuleGraphData({ importedPaths: ["src/cluster/two.ts"] })
    ),
    detectionAt(
      "src/cluster/two.ts",
      1,
      new ModuleGraphData({ importedPaths: ["src/cluster/three.ts"] })
    )
  ]
  const connected = await collectAdvice(
    architectureExploreDerive([
      silentSignal("pass-through-wrappers", wrappers),
      silentSignal("module-graph", graph)
    ])
  )
  const disconnected = await collectAdvice(
    architectureExploreDerive([silentSignal("pass-through-wrappers", wrappers)])
  )

  assert.equal(adviceWithTitle(connected, "bounce cluster").length, 1)
  assert.equal(adviceWithTitle(disconnected, "bounce cluster").length, 0)
})

test("seam and test evidence derive public-interface advice", async () => {
  const testOnly = detectionAt(
    "src/order.ts",
    3,
    new TestOnlyExportData({
      testPaths: ["tests/order.test.ts"],
      testCallCount: 2
    })
  )
  const testLeak = detectionAt(
    "tests/order.test.ts",
    1,
    new SeamLeakageData({
      importedPath: "../src/internal/order.js",
      depth: 4,
      kind: "internal-path",
      fromTest: true
    })
  )
  const productionLeaks = [1, 2].map((line) =>
    detectionAt(
      "src/consumer.ts",
      line,
      new SeamLeakageData({
        importedPath: "./internal/order.js",
        depth: 2,
        kind: "internal-path",
        fromTest: false
      })
    )
  )
  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("test-only-exports", [testOnly]),
      silentSignal("seam-leakage-evidence", [testLeak, ...productionLeaks])
    ])
  )

  assert.equal(adviceWithTitle(advice, "test past interface").length, 2)
  assert.equal(adviceWithTitle(advice, "leaked seam").length, 1)
})

test("collaborator concentration and one adapter derive separate seam advice", async () => {
  const collaboratorData = new ExternalDependencyConstructionData({
    collaboratorName: "PaymentClient",
    importedPath: "@acme/payments"
  })
  const seamData = new SingleAdapterSeamData({
    interfaceName: "PaymentPort",
    productionAdapterCount: 1,
    testAdapterCount: 0
  })
  const advice = await collectAdvice(
    architectureExploreDerive([
      silentSignal("external-dependency-construction", [
        detectionAt("src/order.ts", 3, collaboratorData),
        detectionAt("src/order.ts", 8, collaboratorData)
      ]),
      silentSignal("single-adapter-seams", [
        detectionAt("src/payment.ts", 1, seamData)
      ])
    ])
  )

  assert.equal(adviceWithTitle(advice, "hard-to-test hotspot").length, 1)
  assert.equal(adviceWithTitle(advice, "hypothetical seam").length, 1)
})
