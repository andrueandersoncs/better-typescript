import * as assert from "node:assert/strict"
import { test } from "node:test"
import {
  architectureExploreChecks,
  architectureExploreWiring
} from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  CompositionForwarderData,
  ContextTagSeamData,
  ExportSurfaceData,
  ExportedSymbolUsage,
  ExternalDependencyConstructionData,
  ImportUsageData,
  ImportedNameUsage,
  InterfaceBurdenData,
  ModuleGraphData,
  ModuleIdentityData,
  ModuleScopeEffectData,
  PassThroughWrapperData,
  SeamLeakageData,
  SingleAdapterSeamData,
  TestOnlyExportData
} from "@better-typescript/checks/architectureExplore/data"
import { Detection } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example"
import { Location } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/signal/data"
import { makeWiring } from "@better-typescript/core/engine/wiring"

const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  Detection.make({
    location: Location.make({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

const silentSignal = (name: string, detections: ReadonlyArray<Detection>): Signal =>
  new Signal({ name, reported: false, detections, examples: emptyRefactorExampleSource })

const adviceWithTitle = (advice: ReadonlyArray<Advice>, title: string): ReadonlyArray<Advice> =>
  advice.filter((item) => item.title === title)

const wrapperData = (callerCount: number, hasNonCallReference = false): PassThroughWrapperData =>
  PassThroughWrapperData.make({
    kind: "forwarding-call",
    exportCount: 1,
    callerCount,
    callerPaths: callerCount === 0 ? [] : ["src/caller.ts"],
    hasNonCallReference
  })

const compositionData = (
  callerCount: number,
  hasNonCallReference = false
): CompositionForwarderData =>
  CompositionForwarderData.make({
    exportName: "forward",
    stepCount: 2,
    callerCount,
    callerPaths: callerCount === 0 ? [] : ["src/caller.ts"],
    hasNonCallReference
  })

const graphData = (workspacePath: string, importedPaths: ReadonlyArray<string>): ModuleGraphData =>
  ModuleGraphData.make({
    importedPaths: [...importedPaths],
    workspacePath,
    importedWorkspacePaths: [...importedPaths]
  })

test("architectureExploreWiring contains only relational silent evidence checks", () => {
  const names = architectureExploreChecks.map((check) => check.name)

  assert.deepEqual(names, [
    "pass-through-wrappers",
    "interface-burden",
    "module-graph",
    "test-only-exports",
    "seam-leakage-evidence",
    "import-usage",
    "module-identity",
    "export-surface",
    "external-dependency-construction",
    "single-adapter-seams",
    "composition-forwarders",
    "module-scope-effects",
    "context-tag-seams",
    "composition-fingerprints"
  ])
  assert.equal(new Set(names).size, names.length)
  assert.equal(
    architectureExploreChecks.every((check) => !check.reported),
    true
  )
  assert.equal(makeWiring(architectureExploreWiring).checks.length, 14)
})

test("deletion test removes low-leverage exact forwarders", () => {
  const path = "src/thin.ts"
  const advice = architectureExploreWiring.derive([
    silentSignal("pass-through-wrappers", [detectionAt(path, 1, wrapperData(1))])
  ])
  const deletion = adviceWithTitle(advice, "deletion-test shallowness")

  assert.equal(deletion.length, 1)
  assert.equal(deletion[0]?.location.path, path)
  assert.deepEqual(
    deletion[0]?.evidence.map((item) => item.measure),
    ["deletable-forwarders", "production-callers"]
  )
})

test("deletion test preserves caller leverage and non-call contracts", () => {
  const advice = architectureExploreWiring.derive([
    silentSignal("pass-through-wrappers", [
      detectionAt("src/many.ts", 1, wrapperData(2)),
      detectionAt("src/value.ts", 1, wrapperData(1, true))
    ])
  ])

  assert.equal(adviceWithTitle(advice, "deletion-test shallowness").length, 0)
})

test("composition forwarders feed deletion-test wide-shallow and bounce advice", () => {
  const widePath = "src/compose/client.ts"
  const cluster = ["one", "two", "three"].map((name) => `src/compose/${name}.ts`)
  const forwarders = [1, 2, 3].map((line) => detectionAt(widePath, line, compositionData(1)))
  const clusterForwarders = cluster.map((filePath, index) =>
    detectionAt(filePath, index + 1, compositionData(1))
  )
  const wideBurden = detectionAt(
    widePath,
    1,
    InterfaceBurdenData.make({
      operationCount: 4,
      requiredParameterCount: 6
    })
  )
  const graph = [
    detectionAt(cluster[0]!, 1, graphData(cluster[0]!, [cluster[1]!])),
    detectionAt(cluster[1]!, 1, graphData(cluster[1]!, [cluster[2]!]))
  ]
  const advice = architectureExploreWiring.derive([
    silentSignal("composition-forwarders", [...forwarders, ...clusterForwarders]),
    silentSignal("interface-burden", [wideBurden]),
    silentSignal("module-graph", graph)
  ])

  assert.equal(adviceWithTitle(advice, "deletion-test shallowness").length >= 1, true)
  assert.equal(adviceWithTitle(advice, "wide shallow interface").length, 1)
  assert.equal(adviceWithTitle(advice, "bounce cluster").length, 1)
})

test("wide shallow interface requires a forwarding-dominated burden", () => {
  const widePath = "src/client.ts"
  const deepPath = "src/deep.ts"
  const wideWrappers = [1, 2, 3].map((line) => detectionAt(widePath, line, wrapperData(1)))
  const deepWrappers = [1, 2, 3].map((line) => detectionAt(deepPath, line, wrapperData(1)))
  const wideBurden = detectionAt(
    widePath,
    1,
    InterfaceBurdenData.make({
      operationCount: 4,
      requiredParameterCount: 6
    })
  )
  const deepBurden = detectionAt(
    deepPath,
    1,
    InterfaceBurdenData.make({
      operationCount: 10,
      requiredParameterCount: 12
    })
  )
  const advice = architectureExploreWiring.derive([
    silentSignal("pass-through-wrappers", [...wideWrappers, ...deepWrappers]),
    silentSignal("interface-burden", [wideBurden, deepBurden])
  ])
  const wide = adviceWithTitle(advice, "wide shallow interface")

  assert.equal(wide.length, 1)
  assert.equal(wide[0]?.location.path, widePath)
})

test("bounce cluster requires connected shallow Modules", () => {
  const wrappers = ["one", "two", "three"].map((name, index) =>
    detectionAt(`src/cluster/${name}.ts`, index + 1, wrapperData(1))
  )
  const graph = [
    detectionAt("src/cluster/one.ts", 1, graphData("src/cluster/one.ts", ["src/cluster/two.ts"])),
    detectionAt("src/cluster/two.ts", 1, graphData("src/cluster/two.ts", ["src/cluster/three.ts"]))
  ]
  const connected = architectureExploreWiring.derive([
    silentSignal("pass-through-wrappers", wrappers),
    silentSignal("module-graph", graph)
  ])
  const disconnected = architectureExploreWiring.derive([
    silentSignal("pass-through-wrappers", wrappers)
  ])

  assert.equal(adviceWithTitle(connected, "bounce cluster").length, 1)
  assert.equal(adviceWithTitle(disconnected, "bounce cluster").length, 0)
})

test("seam and test evidence derive public-interface advice", () => {
  const testOnly = detectionAt(
    "src/order.ts",
    3,
    TestOnlyExportData.make({
      testPaths: ["tests/order.test.ts"],
      testCallCount: 2
    })
  )
  const testLeak = detectionAt(
    "tests/order.test.ts",
    1,
    SeamLeakageData.make({
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
      SeamLeakageData.make({
        importedPath: "./internal/order.js",
        depth: 2,
        kind: "internal-path",
        fromTest: false
      })
    )
  )
  const advice = architectureExploreWiring.derive([
    silentSignal("test-only-exports", [testOnly]),
    silentSignal("seam-leakage-evidence", [testLeak, ...productionLeaks])
  ])

  assert.equal(adviceWithTitle(advice, "test past interface").length, 2)
  assert.equal(adviceWithTitle(advice, "leaked seam").length, 1)
})

test("module-scope effects feed hard-to-test hotspot advice", () => {
  const effectData = ModuleScopeEffectData.make({
    calleeText: "Effect.runSync",
    kind: "effect-run"
  })
  const fires = architectureExploreWiring.derive([
    silentSignal("module-scope-effects", [
      detectionAt("src/hot.ts", 1, effectData),
      detectionAt("src/hot.ts", 2, effectData)
    ])
  ])
  const silent = architectureExploreWiring.derive([
    silentSignal("module-scope-effects", [detectionAt("src/cool.ts", 1, effectData)])
  ])
  const mixed = architectureExploreWiring.derive([
    silentSignal("external-dependency-construction", [
      detectionAt(
        "src/mixed.ts",
        1,
        ExternalDependencyConstructionData.make({
          collaboratorName: "PaymentClient",
          importedPath: "@acme/payments"
        })
      )
    ]),
    silentSignal("module-scope-effects", [detectionAt("src/mixed.ts", 2, effectData)])
  ])

  const hotspot = adviceWithTitle(fires, "hard-to-test hotspot")
  assert.equal(hotspot.length, 1)
  assert.deepEqual(
    hotspot[0]?.evidence.map((item) => [item.measure, item.count]),
    [
      ["external-dependency-construction", 0],
      ["module-scope-effects", 2]
    ]
  )
  assert.equal(adviceWithTitle(silent, "hard-to-test hotspot").length, 0)
  assert.equal(adviceWithTitle(mixed, "hard-to-test hotspot").length, 1)
})

test("collaborator concentration and one adapter derive separate seam advice", () => {
  const collaboratorData = ExternalDependencyConstructionData.make({
    collaboratorName: "PaymentClient",
    importedPath: "@acme/payments"
  })
  const seamData = SingleAdapterSeamData.make({
    interfaceName: "PaymentPort",
    productionAdapterCount: 1,
    testAdapterCount: 0
  })
  const advice = architectureExploreWiring.derive([
    silentSignal("external-dependency-construction", [
      detectionAt("src/order.ts", 3, collaboratorData),
      detectionAt("src/order.ts", 8, collaboratorData)
    ]),
    silentSignal("single-adapter-seams", [detectionAt("src/payment.ts", 1, seamData)])
  ])

  assert.equal(adviceWithTitle(advice, "hard-to-test hotspot").length, 1)
  assert.equal(adviceWithTitle(advice, "hypothetical seam").length, 1)
})

test("bidirectional directory pairs derive directory-level leaked seam advice", () => {
  const bidirectional = architectureExploreWiring.derive([
    silentSignal("module-graph", [
      detectionAt(
        "packages/a/src/one.ts",
        1,
        graphData("packages/a/src/one.ts", ["packages/b/src/two.ts"])
      ),
      detectionAt(
        "packages/b/src/two.ts",
        1,
        graphData("packages/b/src/two.ts", ["packages/a/src/one.ts"])
      )
    ])
  ])
  const unidirectional = architectureExploreWiring.derive([
    silentSignal("module-graph", [
      detectionAt(
        "packages/a/src/one.ts",
        1,
        graphData("packages/a/src/one.ts", ["packages/b/src/two.ts"])
      ),
      detectionAt(
        "packages/b/src/two.ts",
        1,
        graphData("packages/b/src/two.ts", ["packages/b/src/other.ts"])
      )
    ])
  ])

  const leaks = adviceWithTitle(bidirectional, "leaked seam")
  assert.equal(leaks.length, 1)
  assert.equal(leaks[0]?.level, "directory")
  assert.equal(leaks[0]?.location.path, "packages/a/src")
  assert.deepEqual(
    leaks[0]?.evidence.map((item) => [item.measure, item.count]),
    [["cross-imports", 2]]
  )
  assert.equal(adviceWithTitle(unidirectional, "leaked seam").length, 0)
})

test("export-surface workspace join derives test-past-interface advice", () => {
  const exportPath = "packages/lib/src/api.ts"
  const symbol = ExportedSymbolUsage.make({
    name: "helper",
    kind: "function",
    referencingFileCount: 0,
    referencingTestFileCount: 0,
    callCount: 3
  })
  const surface = detectionAt(
    exportPath,
    1,
    ExportSurfaceData.make({
      workspacePath: exportPath,
      symbols: [symbol]
    })
  )
  const identity = detectionAt(
    exportPath,
    1,
    ModuleIdentityData.make({
      workspacePath: exportPath,
      aliases: ["@acme/lib"]
    })
  )
  const testImport = detectionAt(
    "packages/app/tests/api.test.ts",
    1,
    ImportUsageData.make({
      specifier: "@acme/lib",
      importerWorkspacePath: "packages/app/tests/api.test.ts",
      fromTest: true,
      names: [
        ImportedNameUsage.make({
          name: "helper",
          referenceCount: 1,
          callCount: 2
        })
      ]
    })
  )
  const prodImport = detectionAt(
    "packages/app/src/use.ts",
    1,
    ImportUsageData.make({
      specifier: "@acme/lib",
      importerWorkspacePath: "packages/app/src/use.ts",
      fromTest: false,
      names: [
        ImportedNameUsage.make({
          name: "helper",
          referenceCount: 1,
          callCount: 1
        })
      ]
    })
  )

  const testOnly = architectureExploreWiring.derive([
    silentSignal("export-surface", [surface]),
    silentSignal("module-identity", [identity]),
    silentSignal("import-usage", [testImport])
  ])
  const withProd = architectureExploreWiring.derive([
    silentSignal("export-surface", [surface]),
    silentSignal("module-identity", [identity]),
    silentSignal("import-usage", [testImport, prodImport])
  ])

  const past = adviceWithTitle(testOnly, "test past interface")
  assert.equal(past.length, 1)
  assert.equal(past[0]?.location.path, exportPath)
  assert.deepEqual(
    past[0]?.evidence.map((item) => [item.measure, item.count]),
    [
      ["test-only-exports", 1],
      ["test-helper-calls", 5],
      ["test-deep-imports", 0]
    ]
  )
  assert.equal(adviceWithTitle(withProd, "test past interface").length, 0)
})

test("export-surface workspace join ignores same-project test-only usage", () => {
  const exportPath = "packages/lib/src/value.ts"
  const surface = detectionAt(
    exportPath,
    1,
    ExportSurfaceData.make({
      workspacePath: exportPath,
      symbols: [
        ExportedSymbolUsage.make({
          name: "value",
          kind: "value",
          referencingFileCount: 1,
          referencingTestFileCount: 1,
          callCount: 0
        })
      ]
    })
  )

  const advice = architectureExploreWiring.derive([silentSignal("export-surface", [surface])])

  assert.equal(adviceWithTitle(advice, "test past interface").length, 0)
})

test("context-tag dead seams derive hypothetical seam advice", () => {
  const dead = ContextTagSeamData.make({
    serviceName: "DeadService",
    productionAdapterCount: 0,
    testAdapterCount: 0,
    consumerCount: 0
  })
  const alive = ContextTagSeamData.make({
    serviceName: "AliveService",
    productionAdapterCount: 2,
    testAdapterCount: 0,
    consumerCount: 3
  })
  const fires = architectureExploreWiring.derive([
    silentSignal("context-tag-seams", [detectionAt("src/dead.ts", 1, dead)])
  ])
  const silent = architectureExploreWiring.derive([
    silentSignal("context-tag-seams", [detectionAt("src/alive.ts", 1, alive)])
  ])

  const advice = adviceWithTitle(fires, "hypothetical seam")
  assert.equal(advice.length, 1)
  assert.deepEqual(
    advice[0]?.evidence.map((item) => [item.measure, item.count]),
    [
      ["single-adapter-seams", 1],
      ["dead-seams", 1]
    ]
  )
  assert.match(advice[0]?.remediation ?? "", /dead surface/)
  assert.equal(adviceWithTitle(silent, "hypothetical seam").length, 0)
})
