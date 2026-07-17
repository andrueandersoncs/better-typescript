import { Array, Function, Option, Result, Struct, Tuple, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import type { ExportSurfaceData, ExportedSymbolUsage } from "./data.js"
import {
  exportSurfaceDataOf,
  seamLeakageDataOf,
  testOnlyExportDataOf,
  workspaceImportEdges
} from "./evidence.js"
import type { WorkspaceImportEdge } from "./evidence.js"
import { exportSurfaceName, seamLeakageEvidenceName, testOnlyExportsName } from "./names.js"

export const testPastInterfaceExamples = packageExamples("test-past-interface")

const edgesForSymbol = (
  edges: ReadonlyArray<WorkspaceImportEdge>,
  workspacePath: string,
  symbolName: string,
  fromTest: boolean
): ReadonlyArray<WorkspaceImportEdge> =>
  Array.filter(edges, (edge) => {
    const importsWorkspacePath = edge.importedPath === workspacePath
    const matchesTestOrigin = edge.fromTest === fromTest
    const importsSymbol = Array.some(edge.names, (usage) => usage.name === symbolName)
    const conditions = Array.make(importsWorkspacePath, matchesTestOrigin, importsSymbol)

    return Array.every(conditions, Boolean)
  })

const crossTestCallCount = (edges: ReadonlyArray<WorkspaceImportEdge>, symbolName: string) =>
  pipe(
    edges,
    Array.flatMap(Struct.get("names")),
    Array.filter((usage) => usage.name === symbolName),
    Array.reduce(0, (total, usage) => total + usage.callCount)
  )

const workspaceTestOnlySymbols =
  (edges: ReadonlyArray<WorkspaceImportEdge>) =>
  (data: ExportSurfaceData): ReadonlyArray<ExportedSymbolUsage> =>
    Array.filter(data.symbols, (symbol) => {
      const crossProdImports = edgesForSymbol(edges, data.workspacePath, symbol.name, false)
      const crossTestImports = edgesForSymbol(edges, data.workspacePath, symbol.name, true)
      const inProjectProd = symbol.referencingFileCount - symbol.referencingTestFileCount
      const productionCallers = inProjectProd + crossProdImports.length
      const hasNoProductionCallers = productionCallers === 0
      const hasCrossTestImports = crossTestImports.length > 0
      const conditions = Array.make(hasNoProductionCallers, hasCrossTestImports)

      return Array.every(conditions, Boolean)
    })

const testPastInterfaceAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const testOnlyExports = Array.filter(elements, (element) => element.name === testOnlyExportsName)

  const testImports = pipe(
    elements,
    Array.filter((element) => element.name === seamLeakageEvidenceName),
    Array.filter((element) =>
      pipe(seamLeakageDataOf(element), Option.exists(Struct.get("fromTest")))
    )
  )

  const edges = workspaceImportEdges(elements)
  const exportSurfaces = Array.filter(elements, (element) => element.name === exportSurfaceName)
  const testOnlySymbolsOf = workspaceTestOnlySymbols(edges)

  const programPaths = pipe(
    Array.appendAll(testOnlyExports, testImports),
    Array.map((element) => element.detection.location.path)
  )

  const workspacePaths = pipe(
    exportSurfaces,
    Array.filter((element) =>
      pipe(
        exportSurfaceDataOf(element),
        Option.exists((data) => {
          const symbols = testOnlySymbolsOf(data)

          return symbols.length > 0
        })
      )
    ),
    Array.map((element) => element.detection.location.path)
  )

  const paths = pipe(Array.appendAll(programPaths, workspacePaths), Array.dedupe)

  return Array.map(paths, (filePath) => {
    const exportsAtPath = Array.filter(
      testOnlyExports,
      (element) => element.detection.location.path === filePath
    )

    const importsAtPath = Array.filter(
      testImports,
      (element) => element.detection.location.path === filePath
    )

    const workspaceAtPath = Array.filter(
      exportSurfaces,
      (element) => element.detection.location.path === filePath
    )

    const workspaceDataAtPath = pipe(
      workspaceAtPath,
      Array.filterMap(Function.flow(exportSurfaceDataOf, Result.fromOption(Function.constVoid)))
    )

    const exportTestCallCount = pipe(
      exportsAtPath,
      Array.filterMap(Function.flow(testOnlyExportDataOf, Result.fromOption(Function.constVoid))),
      Array.reduce(0, (total, data) => total + data.testCallCount)
    )

    const emptyWorkspaceEvidence = Tuple.make(0, 0)

    const workspaceEvidence = pipe(
      workspaceDataAtPath,
      Array.reduce(emptyWorkspaceEvidence, (totals, data) => {
        const symbols = testOnlySymbolsOf(data)

        const callsAtSurface = pipe(
          symbols,
          Array.reduce(0, (total, symbol) => {
            const crossTestImports = edgesForSymbol(edges, data.workspacePath, symbol.name, true)
            const crossTestCalls = crossTestCallCount(crossTestImports, symbol.name)
            return total + symbol.callCount + crossTestCalls
          })
        )

        return Tuple.make(totals[0] + symbols.length, totals[1] + callsAtSurface)
      })
    )

    const workspaceSymbolCount = workspaceEvidence[0]
    const workspaceTestCallCount = workspaceEvidence[1]
    const testCallCount = exportTestCallCount + workspaceTestCallCount
    const location = adviceLocation(filePath)

    const exportsItem = evidenceItem(
      "test-only-exports",
      exportsAtPath.length + workspaceSymbolCount
    )

    const callsItem = evidenceItem("test-helper-calls", testCallCount)
    const importsItem = evidenceItem("test-deep-imports", importsAtPath.length)
    const evidence = Array.make(exportsItem, callsItem, importsItem)
    const examples = testPastInterfaceExamples()

    return new Advice({
      location,
      level: "file",
      title: "test past interface",
      remediation:
        "Tests and production callers must cross the same interface. Exercise observable behaviour through the public Module, " +
        "make test-only helpers private, and replace internal/source imports with the declared seam.",
      evidence,
      examples
    })
  })
}

export const testPastInterface = deriveSignals(testPastInterfaceAdvice)
