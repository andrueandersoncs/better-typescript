import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Effect, Stream } from "effect"
import {
  ExportSurfaceData,
  ImportUsageData,
  ImportedNameUsage,
  InterfaceBurdenData,
  ModuleGraphData
} from "@better-typescript/checks/architectureExplore/data"
import {
  exportSurfaceName,
  importUsageName,
  interfaceBurdenName,
  moduleGraphName
} from "@better-typescript/checks/architectureExplore/names"
import { invisibleTests } from "@better-typescript/checks/architectureExplore/invisibleTests"
import { architectureExploreDerive } from "@better-typescript/checks/preset/architectureExploreWiring"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { namedDetection } from "@better-typescript/core/engine/derive"
import { Detection, Location } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/signal/data"

const derive = await Effect.runPromise(architectureExploreDerive)

const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  new Detection({
    location: new Location({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

const silentSignal = (name: string, detections: ReadonlyArray<Detection>): Signal =>
  new Signal({ name, reported: false, detections, examples: [] })

const collectAdvice = (advice: Stream.Stream<Advice>): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(Stream.runCollect(advice))

const adviceWithTitle = (advice: ReadonlyArray<Advice>, title: string): ReadonlyArray<Advice> =>
  advice.filter((item) => item.title === title)

const nameUsage = (name: string, referenceCount: number): ImportedNameUsage =>
  new ImportedNameUsage({ name, referenceCount, callCount: referenceCount })

const importUsage = (
  specifier: string,
  importerWorkspacePath: string,
  referenceCount: number,
  fromTest = false
): ImportUsageData =>
  new ImportUsageData({
    specifier,
    importerWorkspacePath,
    fromTest,
    names: [nameUsage(specifier.split("/").at(-1) ?? specifier, referenceCount)]
  })

const measureCount = (advice: Advice, measure: string): number | undefined =>
  advice.evidence.find((item) => item.measure === measure)?.count

const hubBurden = (hubPath: string, operationCount: number): Detection =>
  detectionAt(
    hubPath,
    1,
    new InterfaceBurdenData({
      operationCount,
      requiredParameterCount: 0,
      workspacePath: hubPath
    })
  )

const hubGraph = (hubPath: string, importedWorkspacePaths: ReadonlyArray<string>): Detection =>
  detectionAt(
    hubPath,
    2,
    new ModuleGraphData({
      importedPaths: importedWorkspacePaths,
      workspacePath: hubPath,
      importedWorkspacePaths
    })
  )

const callerGraph = (callerPath: string, hubPath: string): Detection =>
  detectionAt(
    callerPath,
    1,
    new ModuleGraphData({
      importedPaths: [hubPath],
      workspacePath: callerPath,
      importedWorkspacePaths: [hubPath]
    })
  )

const importUsageDetections = (
  importer: string,
  count: number,
  referenceFor: (index: number) => number,
  fromTest = false
): ReadonlyArray<Detection> =>
  Array.from({ length: count }, (_, index) =>
    detectionAt(
      importer,
      index + 1,
      importUsage(`./mod-${index}.js`, importer, referenceFor(index), fromTest)
    )
  )

test("registration ceremony fires at 15 imports and 0.8 low-ref ratio", async () => {
  const importer = "src/registry.ts"
  const advice = await collectAdvice(
    derive([
      silentSignal(
        importUsageName,
        importUsageDetections(importer, 15, () => 1)
      )
    ])
  )
  const ceremony = adviceWithTitle(advice, "registration ceremony")

  assert.equal(ceremony.length, 1)
  assert.equal(ceremony[0]?.title, "registration ceremony")
  assert.equal(ceremony[0]?.level, "file")
  assert.equal(ceremony[0]?.location.path, importer)
  assert.equal(measureCount(ceremony[0]!, "imported-modules"), 15)
  assert.equal(measureCount(ceremony[0]!, "single-use-imports"), 15)
  assert.ok(ceremony[0]!.examples.length > 0)
})

test("registration ceremony stays silent at 14 imports or 0.7 ratio", async () => {
  const importer = "src/registry.ts"

  // 15 imports, 10 low-ref names / 15 total => ratio ~0.67 (below 0.8; covers the 0.7 case)
  const fourteenAdvice = await collectAdvice(
    derive([
      silentSignal(
        importUsageName,
        importUsageDetections(importer, 14, () => 1)
      )
    ])
  )
  const lowRatioAdvice = await collectAdvice(
    derive([
      silentSignal(
        importUsageName,
        importUsageDetections(importer, 15, (index) => (index < 10 ? 1 : 5))
      )
    ])
  )

  assert.equal(adviceWithTitle(fourteenAdvice, "registration ceremony").length, 0)
  assert.equal(adviceWithTitle(lowRatioAdvice, "registration ceremony").length, 0)
})

test("registration ceremony ignores fromTest importers", async () => {
  const importer = "tests/registry.test.ts"
  const advice = await collectAdvice(
    derive([
      silentSignal(
        importUsageName,
        importUsageDetections(importer, 15, () => 1, true)
      )
    ])
  )

  assert.equal(adviceWithTitle(advice, "registration ceremony").length, 0)
})

test("hub module fires at 12 operations, fan-in 3, fan-out 6", async () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)
  const callers = ["src/caller-a.ts", "src/caller-b.ts", "src/caller-c.ts"]

  const advice = await collectAdvice(
    derive([
      silentSignal(interfaceBurdenName, [hubBurden(hubPath, 12)]),
      silentSignal(moduleGraphName, [
        hubGraph(hubPath, imported),
        ...callers.map((caller) => callerGraph(caller, hubPath))
      ])
    ])
  )
  const hub = adviceWithTitle(advice, "hub module")

  assert.equal(hub.length, 1)
  assert.equal(hub[0]?.title, "hub module")
  assert.equal(hub[0]?.level, "file")
  assert.equal(hub[0]?.location.path, hubPath)
  assert.equal(measureCount(hub[0]!, "interface-operations"), 12)
  assert.equal(measureCount(hub[0]!, "fan-in-modules"), 3)
  assert.equal(measureCount(hub[0]!, "fan-out-modules"), 6)
  assert.ok(hub[0]!.examples.length > 0)
})

test("hub module stays silent when any threshold leg is below limit", async () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)
  const callers = ["src/caller-a.ts", "src/caller-b.ts", "src/caller-c.ts"]

  const signalsFor = (operationCount: number, fanInCount: number, fanOutCount: number) => [
    silentSignal(interfaceBurdenName, [hubBurden(hubPath, operationCount)]),
    silentSignal(moduleGraphName, [
      hubGraph(hubPath, imported.slice(0, fanOutCount)),
      ...callers.slice(0, fanInCount).map((caller) => callerGraph(caller, hubPath))
    ])
  ]

  const lowOps = await collectAdvice(derive(signalsFor(11, 3, 6)))
  const lowFanIn = await collectAdvice(derive(signalsFor(12, 2, 6)))
  const lowFanOut = await collectAdvice(derive(signalsFor(12, 3, 5)))

  assert.equal(adviceWithTitle(lowOps, "hub module").length, 0)
  assert.equal(adviceWithTitle(lowFanIn, "hub module").length, 0)
  assert.equal(adviceWithTitle(lowFanOut, "hub module").length, 0)
})

test("hub module ignores fromTest fan-in edges", async () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)

  const advice = await collectAdvice(
    derive([
      silentSignal(interfaceBurdenName, [hubBurden(hubPath, 12)]),
      silentSignal(moduleGraphName, [
        hubGraph(hubPath, imported),
        callerGraph("tests/caller.test.ts", hubPath),
        callerGraph("src/caller-a.ts", hubPath),
        callerGraph("src/caller-b.ts", hubPath)
      ])
    ])
  )

  assert.equal(adviceWithTitle(advice, "hub module").length, 0)
})

test("invisible tests fires when evidence has no test paths", async () => {
  const elements = [
    namedDetection(moduleGraphName)(
      detectionAt(
        "src/a.ts",
        1,
        new ModuleGraphData({
          importedPaths: ["./b.ts"],
          workspacePath: "src/a.ts",
          importedWorkspacePaths: ["src/b.ts"]
        })
      )
    ),
    namedDetection(importUsageName)(
      detectionAt("src/a.ts", 2, importUsage("./b.js", "src/a.ts", 1))
    ),
    namedDetection(exportSurfaceName)(
      detectionAt("src/b.ts", 3, new ExportSurfaceData({ workspacePath: "src/b.ts", symbols: [] }))
    )
  ]

  const advice = await collectAdvice(invisibleTests(Stream.fromIterable(elements)))

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "invisible tests")
  assert.equal(advice[0]?.level, "project")
  assert.equal(advice[0]?.location.path, ".")
  assert.equal(measureCount(advice[0]!, "analyzed-modules"), 2)
  assert.equal(advice[0]?.examples.length, 0)
})

test("invisible tests stays silent when any path is a test path", async () => {
  const elements = [
    namedDetection(moduleGraphName)(
      detectionAt(
        "src/a.ts",
        1,
        new ModuleGraphData({
          importedPaths: ["./b.ts"],
          workspacePath: "src/a.ts",
          importedWorkspacePaths: ["src/b.ts"]
        })
      )
    ),
    namedDetection(importUsageName)(
      detectionAt("tests/a.test.ts", 2, importUsage("./b.js", "tests/a.test.ts", 1, true))
    )
  ]

  const advice = await collectAdvice(invisibleTests(Stream.fromIterable(elements)))

  assert.equal(advice.length, 0)
})
