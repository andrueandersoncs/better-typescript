import { Array, Function, Option, Result, Struct, Tuple, pipe } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import type { ExportSurfaceData, ExportedSymbolUsage, ImportedNameUsage } from "./data.js"
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
    const importsWorkspacePath = strictEqual(edge.importedPath, workspacePath)
    const matchesTestOrigin = strictEqual(edge.fromTest, fromTest)

    const usageHasSymbolName = (usage: (typeof edge.names)[number]) =>
      strictEqual(usage.name, symbolName)

    const importsSymbol = Array.some(edge.names, usageHasSymbolName)
    const conditions = Array.make(importsWorkspacePath, matchesTestOrigin, importsSymbol)

    return Array.every(conditions, Boolean)
  })

const crossTestCallCount = (edges: ReadonlyArray<WorkspaceImportEdge>, symbolName: string) => {
  const usageHasSymbolName = (usage: ImportedNameUsage) => strictEqual(usage.name, symbolName)

  return pipe(
    edges,
    Array.flatMap(Struct.get("names")),
    Array.filter(usageHasSymbolName),
    Array.reduce(0, (total, usage) => total + usage.callCount)
  )
}

const workspaceTestOnlySymbols =
  (edges: ReadonlyArray<WorkspaceImportEdge>) =>
  (data: ExportSurfaceData): ReadonlyArray<ExportedSymbolUsage> =>
    Array.filter(data.symbols, (symbol) => {
      const crossProdImports = edgesForSymbol(edges, data.workspacePath, symbol.name, false)
      const crossTestImports = edgesForSymbol(edges, data.workspacePath, symbol.name, true)
      const inProjectProd = symbol.referencingFileCount - symbol.referencingTestFileCount
      const productionCallers = inProjectProd + crossProdImports.length
      const hasNoProductionCallers = strictEqual(productionCallers, 0)
      const hasCrossTestImports = crossTestImports.length > 0
      const conditions = Array.make(hasNoProductionCallers, hasCrossTestImports)

      return Array.every(conditions, Boolean)
    })

const isSeamLeakageFromTest = Function.flow(
  seamLeakageDataOf,
  Option.exists(Struct.get("fromTest"))
)

const testPastInterfaceAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const isTestOnlyExportElement = (element: NamedDetection) =>
    strictEqual(element.name, testOnlyExportsName)

  const isSeamLeakageElement = (element: NamedDetection) =>
    strictEqual(element.name, seamLeakageEvidenceName)

  const isExportSurfaceElement = (element: NamedDetection) =>
    strictEqual(element.name, exportSurfaceName)

  const testOnlyExports = Array.filter(elements, isTestOnlyExportElement)

  const testImports = pipe(
    elements,
    Array.filter(isSeamLeakageElement),
    Array.filter(isSeamLeakageFromTest)
  )

  const edges = workspaceImportEdges(elements)
  const exportSurfaces = Array.filter(elements, isExportSurfaceElement)
  const testOnlySymbolsOf = workspaceTestOnlySymbols(edges)

  const hasTestOnlySymbols = (element: NamedDetection) =>
    pipe(
      exportSurfaceDataOf(element),
      Option.exists((data) => {
        const symbols = testOnlySymbolsOf(data)

        return symbols.length > 0
      })
    )

  const programPaths = pipe(
    Array.appendAll(testOnlyExports, testImports),
    Array.map((element) => element.detection.location.path)
  )

  const workspacePaths = pipe(
    exportSurfaces,
    Array.filter(hasTestOnlySymbols),
    Array.map((element) => element.detection.location.path)
  )

  const paths = pipe(Array.appendAll(programPaths, workspacePaths), Array.dedupe)

  return Array.map(paths, (filePath) => {
    const hasPath = (element: NamedDetection) =>
      strictEqual(element.detection.location.path, filePath)

    const exportsAtPath = Array.filter(testOnlyExports, hasPath)
    const importsAtPath = Array.filter(testImports, hasPath)
    const workspaceAtPath = Array.filter(exportSurfaces, hasPath)

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
        const symbolCount = Tuple.get(totals, 0)
        const callCount = Tuple.get(totals, 1)

        const callsAtSurface = pipe(
          symbols,
          Array.reduce(0, (total, symbol) => {
            const crossTestImports = edgesForSymbol(edges, data.workspacePath, symbol.name, true)
            const crossTestCalls = crossTestCallCount(crossTestImports, symbol.name)
            return total + symbol.callCount + crossTestCalls
          })
        )

        const nextSymbolCount = symbolCount + symbols.length
        const nextCallCount = callCount + callsAtSurface

        return Tuple.make(nextSymbolCount, nextCallCount)
      })
    )

    const workspaceSymbolCount = Tuple.get(workspaceEvidence, 0)
    const workspaceTestCallCount = Tuple.get(workspaceEvidence, 1)
    const testCallCount = exportTestCallCount + workspaceTestCallCount
    const location = makeAdviceLocation(filePath)

    const exportsItem = makeEvidenceItem(
      "test-only-exports",
      exportsAtPath.length + workspaceSymbolCount
    )

    const callsItem = makeEvidenceItem("test-helper-calls", testCallCount)
    const importsItem = makeEvidenceItem("test-deep-imports", importsAtPath.length)
    const evidence = Array.make(exportsItem, callsItem, importsItem)
    const examples = testPastInterfaceExamples

    return Advice.make({
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
