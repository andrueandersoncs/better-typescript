import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { ExportSurfaceData } from "@better-typescript/matchers/builtins/exportSurface"
import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import {
  hubModule,
  registrationCeremony
} from "@better-typescript/guidance/architectureExplore/architectureExploreDependencyStructureAdvisers"
import { invisibleTests } from "@better-typescript/guidance/architectureExplore/architectureExploreTestabilityAdvisers"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { detectionAt } from "./architectureExploreStructureDetectionAt.js"
import { importUsage } from "./architectureExploreStructureImportUsage.js"
import { measureCount } from "./architectureExploreStructureMeasureCount.js"
import { hubBurden } from "./architectureExploreStructureHubBurden.js"
import { hubGraph } from "./architectureExploreStructureHubGraph.js"
import { callerGraph } from "./architectureExploreStructureCallerGraph.js"

test("registration ceremony fires at 15 imports and 0.8 low-ref ratio", () => {
  const importer = "src/registry.ts"
  const elements = Array.from({ length: 15 }, (_, index) =>
    makeNamedDetection("import-usage")(
      detectionAt(importer, index + 1, importUsage(`./mod-${index}.js`, importer, 1))
    )
  )

  const advice = registrationCeremony(elements)

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "registration ceremony")
  assert.equal(advice[0]?.level, "file")
  assert.equal(advice[0]?.location.path, importer)
  assert.equal(measureCount(advice[0]!, "imported-modules"), 15)
  assert.equal(measureCount(advice[0]!, "single-use-imports"), 15)
})

test("registration ceremony stays silent at 14 imports or 0.7 ratio", () => {
  const importer = "src/registry.ts"

  const fourteen = Array.from({ length: 14 }, (_, index) =>
    makeNamedDetection("import-usage")(
      detectionAt(importer, index + 1, importUsage(`./mod-${index}.js`, importer, 1))
    )
  )

  // 15 imports, 10 low-ref names / 15 total => ratio ~0.67 (below 0.8; covers the 0.7 case)
  const lowRatio = Array.from({ length: 15 }, (_, index) =>
    makeNamedDetection("import-usage")(
      detectionAt(
        importer,
        index + 1,
        importUsage(`./mod-${index}.js`, importer, index < 10 ? 1 : 5)
      )
    )
  )

  const fourteenAdvice = registrationCeremony(fourteen)
  const lowRatioAdvice = registrationCeremony(lowRatio)

  assert.equal(fourteenAdvice.length, 0)
  assert.equal(lowRatioAdvice.length, 0)
})

test("registration ceremony ignores invoked imports", () => {
  const importer = "src/derive.ts"
  const elements = Array.from({ length: 15 }, (_, index) =>
    makeNamedDetection("import-usage")(
      detectionAt(importer, index + 1, importUsage(`./adviser-${index}.js`, importer, 1, false, 1))
    )
  )

  const advice = registrationCeremony(elements)

  assert.equal(advice.length, 0)
})

test("registration ceremony ignores fromTest importers", () => {
  const importer = "tests/registry.test.ts"
  const elements = Array.from({ length: 15 }, (_, index) =>
    makeNamedDetection("import-usage")(
      detectionAt(importer, index + 1, importUsage(`./mod-${index}.js`, importer, 1, true))
    )
  )

  const advice = registrationCeremony(elements)

  assert.equal(advice.length, 0)
})

test("hub module fires at 12 operations, fan-in 3, fan-out 6", () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)
  const callers = ["src/caller-a.ts", "src/caller-b.ts", "src/caller-c.ts"]

  const elements = [
    makeNamedDetection("interface-burden")(hubBurden(hubPath, 12)),
    makeNamedDetection("module-graph")(hubGraph(hubPath, imported)),
    ...callers.map((caller) => makeNamedDetection("module-graph")(callerGraph(caller, hubPath)))
  ]

  const advice = hubModule(elements)

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "hub module")
  assert.equal(advice[0]?.level, "file")
  assert.equal(advice[0]?.location.path, hubPath)
  assert.equal(measureCount(advice[0]!, "interface-operations"), 12)
  assert.equal(measureCount(advice[0]!, "fan-in-modules"), 3)
  assert.equal(measureCount(advice[0]!, "fan-out-modules"), 6)
})

test("hub module stays silent when any threshold leg is below limit", () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)
  const callers = ["src/caller-a.ts", "src/caller-b.ts", "src/caller-c.ts"]

  const elementsFor = (operationCount: number, fanInCount: number, fanOutCount: number) => [
    makeNamedDetection("interface-burden")(hubBurden(hubPath, operationCount)),
    makeNamedDetection("module-graph")(hubGraph(hubPath, imported.slice(0, fanOutCount))),
    ...callers
      .slice(0, fanInCount)
      .map((caller) => makeNamedDetection("module-graph")(callerGraph(caller, hubPath)))
  ]

  const lowOps = hubModule(elementsFor(11, 3, 6))
  const lowFanIn = hubModule(elementsFor(12, 2, 6))
  const lowFanOut = hubModule(elementsFor(12, 3, 5))

  assert.equal(lowOps.length, 0)
  assert.equal(lowFanIn.length, 0)
  assert.equal(lowFanOut.length, 0)
})

test("hub module ignores fromTest fan-in edges", () => {
  const hubPath = "src/hub.ts"
  const imported = Array.from({ length: 6 }, (_, index) => `src/dep-${index}.ts`)

  const elements = [
    makeNamedDetection("interface-burden")(hubBurden(hubPath, 12)),
    makeNamedDetection("module-graph")(hubGraph(hubPath, imported)),
    makeNamedDetection("module-graph")(callerGraph("tests/caller.test.ts", hubPath)),
    makeNamedDetection("module-graph")(callerGraph("src/caller-a.ts", hubPath)),
    makeNamedDetection("module-graph")(callerGraph("src/caller-b.ts", hubPath))
  ]

  const advice = hubModule(elements)

  assert.equal(advice.length, 0)
})

test("invisible tests fires when evidence has no test paths", () => {
  const elements = [
    makeNamedDetection("module-graph")(
      detectionAt(
        "src/a.ts",
        1,
        ModuleGraphData.make({
          importedPaths: ["./b.ts"],
          workspacePath: "src/a.ts",
          importedWorkspacePaths: ["src/b.ts"]
        })
      )
    ),
    makeNamedDetection("import-usage")(
      detectionAt("src/a.ts", 2, importUsage("./b.js", "src/a.ts", 1))
    ),
    makeNamedDetection("export-surface")(
      detectionAt("src/b.ts", 3, ExportSurfaceData.make({ workspacePath: "src/b.ts", symbols: [] }))
    )
  ]

  const advice = invisibleTests(elements)

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "invisible tests")
  assert.equal(advice[0]?.level, "project")
  assert.equal(advice[0]?.location.path, ".")
  assert.equal(measureCount(advice[0]!, "analyzed-modules"), 2)
  assert.deepEqual(advice[0]?.examples, emptyRefactorExampleSource)
})

test("invisible tests stays silent when any path is a test path", () => {
  const elements = [
    makeNamedDetection("module-graph")(
      detectionAt(
        "src/a.ts",
        1,
        ModuleGraphData.make({
          importedPaths: ["./b.ts"],
          workspacePath: "src/a.ts",
          importedWorkspacePaths: ["src/b.ts"]
        })
      )
    ),
    makeNamedDetection("import-usage")(
      detectionAt("tests/a.test.ts", 2, importUsage("./b.js", "tests/a.test.ts", 1, true))
    )
  ]

  const advice = invisibleTests(elements)

  assert.equal(advice.length, 0)
})
