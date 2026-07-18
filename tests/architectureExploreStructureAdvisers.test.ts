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
import { registrationCeremony } from "@better-typescript/checks/architectureExplore/registrationCeremony"
import { hubModule } from "@better-typescript/checks/architectureExplore/hubModule"
import { invisibleTests } from "@better-typescript/checks/architectureExplore/invisibleTests"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { makeNamedDetection } from "@better-typescript/core/engine/derive"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example"
import { Detection, Location } from "@better-typescript/core/engine/location/data"

const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  new Detection({
    location: new Location({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

const collectAdvice = (advice: Stream.Stream<Advice>): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(Stream.runCollect(advice))

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

test("registration ceremony fires at 15 imports and 0.8 low-ref ratio", async () => {
  const importer = "src/registry.ts"
  const elements = Array.from({ length: 15 }, (_, index) =>
    makeNamedDetection(importUsageName)(
      detectionAt(importer, index + 1, importUsage(`./mod-${index}.js`, importer, 1))
    )
  )

  const advice = await collectAdvice(registrationCeremony(Stream.fromIterable(elements)))

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "registration ceremony")
  assert.equal(advice[0]?.level, "file")
  assert.equal(advice[0]?.location.path, importer)
  assert.equal(measureCount(advice[0]!, "imported-modules"), 15)
  assert.equal(measureCount(advice[0]!, "single-use-imports"), 15)
})

test("registration ceremony stays silent at 14 imports or 0.7 ratio", async () => {
  const importer = "src/registry.ts"

  const fourteen = Array.from({ length: 14 }, (_, index) =>
    makeNamedDetection(importUsageName)(
      detectionAt(importer, index + 1, importUsage(`./mod-${index}.js`, importer, 1))
    )
  )

  // 15 imports, 10 low-ref names / 15 total => ratio ~0.67 (below 0.8; covers the 0.7 case)
  const lowRatio = Array.from({ length: 15 }, (_, index) =>
    makeNamedDetection(importUsageName)(
      detectionAt(
        importer,
        index + 1,
        importUsage(`./mod-${index}.js`, importer, index < 10 ? 1 : 5)
      )
    )
  )

  const fourteenAdvice = await collectAdvice(registrationCeremony(Stream.fromIterable(fourteen)))
  const lowRatioAdvice = await collectAdvice(registrationCeremony(Stream.fromIterable(lowRatio)))

  assert.equal(fourteenAdvice.length, 0)
  assert.equal(lowRatioAdvice.length, 0)
})

test("registration ceremony ignores fromTest importers", async () => {
  const importer = "tests/registry.test.ts"
  const elements = Array.from({ length: 15 }, (_, index) =>
    makeNamedDetection(importUsageName)(
      detectionAt(importer, index + 1, importUsage(`./mod-${index}.js`, importer, 1, true))
    )
  )

  const advice = await collectAdvice(registrationCeremony(Stream.fromIterable(elements)))

  assert.equal(advice.length, 0)
})

test("hub module fires at 12 operations, fan-in 3, fan-out 6", async () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)
  const callers = ["src/caller-a.ts", "src/caller-b.ts", "src/caller-c.ts"]

  const elements = [
    makeNamedDetection(interfaceBurdenName)(hubBurden(hubPath, 12)),
    makeNamedDetection(moduleGraphName)(hubGraph(hubPath, imported)),
    ...callers.map((caller) => makeNamedDetection(moduleGraphName)(callerGraph(caller, hubPath)))
  ]

  const advice = await collectAdvice(hubModule(Stream.fromIterable(elements)))

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "hub module")
  assert.equal(advice[0]?.level, "file")
  assert.equal(advice[0]?.location.path, hubPath)
  assert.equal(measureCount(advice[0]!, "interface-operations"), 12)
  assert.equal(measureCount(advice[0]!, "fan-in-modules"), 3)
  assert.equal(measureCount(advice[0]!, "fan-out-modules"), 6)
})

test("hub module stays silent when any threshold leg is below limit", async () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)
  const callers = ["src/caller-a.ts", "src/caller-b.ts", "src/caller-c.ts"]

  const elementsFor = (operationCount: number, fanInCount: number, fanOutCount: number) => [
    makeNamedDetection(interfaceBurdenName)(hubBurden(hubPath, operationCount)),
    makeNamedDetection(moduleGraphName)(hubGraph(hubPath, imported.slice(0, fanOutCount))),
    ...callers
      .slice(0, fanInCount)
      .map((caller) => makeNamedDetection(moduleGraphName)(callerGraph(caller, hubPath)))
  ]

  const lowOps = await collectAdvice(hubModule(Stream.fromIterable(elementsFor(11, 3, 6))))
  const lowFanIn = await collectAdvice(hubModule(Stream.fromIterable(elementsFor(12, 2, 6))))
  const lowFanOut = await collectAdvice(hubModule(Stream.fromIterable(elementsFor(12, 3, 5))))

  assert.equal(lowOps.length, 0)
  assert.equal(lowFanIn.length, 0)
  assert.equal(lowFanOut.length, 0)
})

test("hub module ignores fromTest fan-in edges", async () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)

  const elements = [
    makeNamedDetection(interfaceBurdenName)(hubBurden(hubPath, 12)),
    makeNamedDetection(moduleGraphName)(hubGraph(hubPath, imported)),
    makeNamedDetection(moduleGraphName)(callerGraph("tests/caller.test.ts", hubPath)),
    makeNamedDetection(moduleGraphName)(callerGraph("src/caller-a.ts", hubPath)),
    makeNamedDetection(moduleGraphName)(callerGraph("src/caller-b.ts", hubPath))
  ]

  const advice = await collectAdvice(hubModule(Stream.fromIterable(elements)))

  assert.equal(advice.length, 0)
})

test("invisible tests fires when evidence has no test paths", async () => {
  const elements = [
    makeNamedDetection(moduleGraphName)(
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
    makeNamedDetection(importUsageName)(
      detectionAt("src/a.ts", 2, importUsage("./b.js", "src/a.ts", 1))
    ),
    makeNamedDetection(exportSurfaceName)(
      detectionAt("src/b.ts", 3, new ExportSurfaceData({ workspacePath: "src/b.ts", symbols: [] }))
    )
  ]

  const advice = await collectAdvice(invisibleTests(Stream.fromIterable(elements)))

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "invisible tests")
  assert.equal(advice[0]?.level, "project")
  assert.equal(advice[0]?.location.path, ".")
  assert.equal(measureCount(advice[0]!, "analyzed-modules"), 2)
  assert.deepEqual(advice[0]?.examples, emptyRefactorExampleSource)
})

test("invisible tests stays silent when any path is a test path", async () => {
  const elements = [
    makeNamedDetection(moduleGraphName)(
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
    makeNamedDetection(importUsageName)(
      detectionAt("tests/a.test.ts", 2, importUsage("./b.js", "tests/a.test.ts", 1, true))
    )
  ]

  const advice = await collectAdvice(invisibleTests(Stream.fromIterable(elements)))

  assert.equal(advice.length, 0)
})
