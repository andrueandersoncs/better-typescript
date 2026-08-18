import { architectureExploreIsTestPath } from "./architectureExploreIsTestPath.js"
import path from "node:path"
import {
  Array,
  Data,
  Function,
  HashMap,
  Option,
  Predicate,
  Result,
  Schema,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { deriveSignals } from "@better-typescript/core/engine/derive/deriveSignals"
import { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makePackageExamples } from "../makePackageExamples.js"
import { WorkspaceImportEdge } from "./architectureExploreWorkspaceImportEdge.js"
import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { InterfaceBurdenData } from "@better-typescript/matchers/builtins/interfaceBurden"
import { SeamLeakageData } from "@better-typescript/matchers/builtins/seamLeakageEvidence"
import { ExportSurfaceData } from "@better-typescript/matchers/builtins/exportSurface"
import { ExportedSymbolUsage } from "@better-typescript/matchers/builtins/architectureExplore/exportedSymbolUsage"
import { ImportedNameUsage } from "@better-typescript/matchers/builtins/architectureExplore/importedNameUsage"
import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { ModuleIdentityData } from "@better-typescript/matchers/builtins/moduleIdentity"
import { TestOnlyExportData } from "@better-typescript/matchers/builtins/testOnlyExports"
import { architectureExploreCorePolicies } from "../preset/architectureExploreCorePolicies.js"

const makeArchitectureExploreDependencyStructureAdvisers = () => {
  const [
    ,
    interfaceBurdenPolicy,
    moduleGraphPolicy,
    testOnlyExportsPolicy,
    seamLeakageEvidencePolicy,
    importUsagePolicy,
    moduleIdentityPolicy,
    exportSurfacePolicy
  ] = architectureExploreCorePolicies

  const deriveCheckedData = <A>(
    guard: (input: unknown) => input is A,
    element: NamedDetection
  ): Option.Option<A> =>
    guard(element.detection.data) ? Option.some(element.detection.data) : Option.none<A>()

  const interfaceBurdenDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(InterfaceBurdenData), element)

  const deriveModuleGraphDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ModuleGraphData), element)

  const testOnlyExportDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(TestOnlyExportData), element)

  const seamLeakageDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(SeamLeakageData), element)

  const importUsageDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ImportUsageData), element)

  const exportSurfaceDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ExportSurfaceData), element)

  const emptyImportedNames: ReadonlyArray<ImportedNameUsage> = Array.empty()
  const isModuleIdentityData = Schema.is(ModuleIdentityData)

  const aliasEntriesOf = (element: NamedDetection): ReadonlyArray<readonly [string, string]> =>
    pipe(
      deriveCheckedData(isModuleIdentityData, element),
      Option.map((data: ModuleIdentityData) => {
        const pairWithWorkspace = (alias: string) => Tuple.make(alias, data.workspacePath)

        return Array.map(data.aliases, pairWithWorkspace)
      }),
      Option.getOrElse(Array.empty)
    )

  const graphEdgesOf = (element: NamedDetection): ReadonlyArray<WorkspaceImportEdge> =>
    pipe(
      deriveModuleGraphDataOf(element),
      Option.map((data: ModuleGraphData) => {
        const fromTest = architectureExploreIsTestPath(data.workspacePath)

        const makeWorkspaceImportEdge = (importedPath: string) =>
          new WorkspaceImportEdge({
            importerPath: data.workspacePath,
            importedPath,
            fromTest,
            names: emptyImportedNames
          })

        return Array.map(data.importedWorkspacePaths, makeWorkspaceImportEdge)
      }),
      Option.getOrElse(Array.empty)
    )

  const usageEdgeOf = (aliasTable: HashMap.HashMap<string, string>) => (element: NamedDetection) =>
    pipe(
      importUsageDataOf(element),
      Option.flatMap((data: ImportUsageData) => {
        const makeWorkspaceImportEdge = (importedPath: string) =>
          new WorkspaceImportEdge({
            importerPath: data.importerWorkspacePath,
            importedPath,
            fromTest: data.fromTest,
            names: data.names
          })

        return pipe(HashMap.get(aliasTable, data.specifier), Option.map(makeWorkspaceImportEdge))
      })
    )

  // Graph and alias edges stay disjoint because project edges never carry bare package specifiers.

  const deriveWorkspaceImportEdges = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<WorkspaceImportEdge> => {
    const isModuleIdentityElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleIdentityPolicy.name)
    )

    const isModuleGraphElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleGraphPolicy.name)
    )

    const isImportUsageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(importUsagePolicy.name)
    )

    const identityElements = Array.filter(elements, isModuleIdentityElement)
    const aliasEntries = Array.flatMap(identityElements, aliasEntriesOf)
    const aliasTable = HashMap.fromIterable(aliasEntries)

    const graphEdges = pipe(
      elements,
      Array.filter(isModuleGraphElement),
      Array.flatMap(graphEdgesOf)
    )

    const usageEdges = pipe(
      elements,
      Array.filter(isImportUsageElement),
      Array.filterMap(Function.flow(usageEdgeOf(aliasTable), Result.fromOption(Function.constVoid)))
    )

    return Array.appendAll(graphEdges, usageEdges)
  }

  const hubModuleExamples = makePackageExamples("hub-module")
  const minimumOperations = 12
  const minimumFanIn = 3
  const minimumFanOut = 6

  const hubAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const edges = deriveWorkspaceImportEdges(elements)

    const isInterfaceBurdenElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(interfaceBurdenPolicy.name)
    )

    const isModuleGraphElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleGraphPolicy.name)
    )

    const isProductionWorkspaceBurden = (data: InterfaceBurdenData) =>
      pipe(
        data.workspacePath,
        Option.liftPredicate(Predicate.isString),
        Option.exists((workspacePath) => {
          const hasWorkspacePath = !strictEqual("")(workspacePath)
          const hasProductionPath = !architectureExploreIsTestPath(workspacePath)
          const conditions = Array.make(hasWorkspacePath, hasProductionPath)

          return Array.every(conditions, Boolean)
        })
      )

    const burdens = pipe(
      elements,
      Array.filter(isInterfaceBurdenElement),
      Array.filterMap(Function.flow(interfaceBurdenDataOf, Result.fromOption(Function.constVoid))),
      Array.filter(isProductionWorkspaceBurden)
    )

    const moduleGraphs = pipe(
      elements,
      Array.filter(isModuleGraphElement),
      Array.filterMap(Function.flow(deriveModuleGraphDataOf, Result.fromOption(Function.constVoid)))
    )

    return Array.filterMap(burdens, (burden) => {
      if (!Predicate.isString(burden.workspacePath)) {
        return Result.failVoid
      }

      const fanIn = pipe(
        edges,
        Array.filter((edge) => {
          const importsWorkspacePath = strictEqual(burden.workspacePath)(edge.importedPath)
          const isProductionImport = !edge.fromTest
          const conditions = Array.make(importsWorkspacePath, isProductionImport)

          return Array.every(conditions, Boolean)
        }),
        Array.map(Struct.get<WorkspaceImportEdge, "importerPath">("importerPath")),
        Array.dedupe
      ).length

      const matchesWorkspacePath = flow(
        Struct.get<(typeof moduleGraphs)[number], "workspacePath">("workspacePath"),
        strictEqual(burden.workspacePath)
      )

      const fanOut = pipe(
        moduleGraphs,
        Array.findFirst(matchesWorkspacePath),
        Option.map((data: ModuleGraphData) => data.importedWorkspacePaths.length),
        Option.getOrElse(Function.constant(0))
      )

      const operationsBelowMinimum = burden.operationCount < minimumOperations
      const fanInBelowMinimum = fanIn < minimumFanIn
      const fanOutBelowMinimum = fanOut < minimumFanOut

      const minimumChecks = Array.make(
        operationsBelowMinimum,
        fanInBelowMinimum,
        fanOutBelowMinimum
      )

      const isBelowMinimum = Array.some(minimumChecks, Boolean)

      if (isBelowMinimum) {
        return Result.failVoid
      }

      const location = Location.make({ path: burden.workspacePath })

      const operationsItem = EvidenceItem.make({
        measure: "interface-operations",
        count: burden.operationCount
      })

      const fanInItem = EvidenceItem.make({ measure: "fan-in-modules", count: fanIn })
      const fanOutItem = EvidenceItem.make({ measure: "fan-out-modules", count: fanOut })
      const evidence = Array.make(operationsItem, fanInItem, fanOutItem)

      const advice = Advice.make({
        location,
        level: "file",
        title: "hub module",
        remediation:
          "A hub Module hides several Modules behind one name. " +
          "Split along its consumer seams so each caller learns one smaller interface.",
        evidence,
        examples: hubModuleExamples
      })

      return Result.succeed(advice)
    })
  }

  const hubModule = deriveSignals(hubAdvice)
  const leakedSeamExamples = makePackageExamples("leaked-seam")
  const minimumLeaks = 2
  const isProductionPath = Predicate.not(architectureExploreIsTestPath)

  const directoryEdgesFromData = (
    data: ModuleGraphData
  ): ReadonlyArray<readonly [string, string]> => {
    if (architectureExploreIsTestPath(data.workspacePath)) {
      return Array.empty<readonly [string, string]>()
    }

    const fromDirectory = path.posix.dirname(data.workspacePath)

    const edgeFromImport = (importedPath: string) => {
      const toDirectory = path.posix.dirname(importedPath)

      return Tuple.make(fromDirectory, toDirectory)
    }

    const isCrossDirectory = ([from, to]: readonly [string, string]) => !strictEqual(from)(to)

    return pipe(
      data.importedWorkspacePaths,
      Array.filter(isProductionPath),
      Array.map(edgeFromImport),
      Array.filter(isCrossDirectory)
    )
  }

  const directoryEdgesFromElement = (element: NamedDetection) =>
    pipe(
      deriveModuleGraphDataOf(element),
      Option.map(directoryEdgesFromData),
      Option.getOrElse(Array.empty)
    )

  const fileLeakAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isSeamLeakageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(seamLeakageEvidencePolicy.name)
    )

    const hasPath = (filePath: string) =>
      flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(filePath)
      )

    const isInternalPath = flow(
      Struct.get<SeamLeakageData, "kind">("kind"),
      strictEqual("internal-path")
    )

    const leaks = Array.filter(elements, isSeamLeakageElement)

    const paths = pipe(
      leaks,
      Array.map(
        flow(
          Struct.get<NamedDetection, "detection">("detection"),
          Struct.get<NamedDetection["detection"], "location">("location"),
          Struct.get<NamedDetection["detection"]["location"], "path">("path")
        )
      ),
      Array.dedupe
    )

    return Array.filterMap(paths, (filePath) => {
      const atPath = Array.filter(leaks, hasPath(filePath))

      if (atPath.length < minimumLeaks) {
        return Result.failVoid
      }

      const internalCount = pipe(
        atPath,
        Array.filterMap(Function.flow(seamLeakageDataOf, Result.fromOption(Function.constVoid))),
        Array.countBy(isInternalPath)
      )

      const sourceCount = atPath.length - internalCount
      const location = Location.make({ path: filePath })

      const internalItem = EvidenceItem.make({
        measure: "internal-path-imports",
        count: internalCount
      })

      const sourceItem = EvidenceItem.make({ measure: "source-path-imports", count: sourceCount })
      const evidence = Array.make(internalItem, sourceItem)

      const advice = Advice.make({
        location,
        level: "file",
        title: "leaked seam",
        remediation:
          "This Module repeatedly bypasses declared interfaces through internal or package-source imports. " +
          "Route dependencies through one public seam so implementation paths remain local and replaceable.",
        evidence,
        examples: leakedSeamExamples
      })

      return Result.succeed(advice)
    })
  }

  const directoryPairAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isModuleGraphElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleGraphPolicy.name)
    )

    const graphElements = Array.filter(elements, isModuleGraphElement)
    const directoryEdges = Array.flatMap(graphElements, directoryEdgesFromElement)

    const directories = pipe(
      directoryEdges,
      Array.flatMap(([from, to]) => Array.make(from, to)),
      Array.dedupe
    )

    const pairs = Array.flatMap(directories, (left) => {
      const isGreaterThanLeft = (right: string) => left < right

      const pairWithLeft = (right: string) => {
        const forwardCount = Array.countBy(directoryEdges, ([from, to]) => {
          const fromMatches = strictEqual(left)(from)
          const toMatches = strictEqual(right)(to)
          const conditions = Array.make(fromMatches, toMatches)

          return Array.every(conditions, Boolean)
        })

        const reverseCount = Array.countBy(directoryEdges, ([from, to]) => {
          const fromMatches = strictEqual(right)(from)
          const toMatches = strictEqual(left)(to)
          const conditions = Array.make(fromMatches, toMatches)

          return Array.every(conditions, Boolean)
        })

        const smallestDirectionCount = Math.min(forwardCount, reverseCount)

        if (strictEqual(0)(smallestDirectionCount)) {
          return Result.failVoid
        }

        const crossImports = forwardCount + reverseCount
        const pair = Tuple.make(left, right, crossImports)

        return Result.succeed(pair)
      }

      return pipe(directories, Array.filter(isGreaterThanLeft), Array.filterMap(pairWithLeft))
    })

    return Array.map(pairs, ([left, right, crossImports]) => {
      const smaller = left < right ? left : right
      const location = Location.make({ path: smaller })
      const crossImportsItem = EvidenceItem.make({ measure: "cross-imports", count: crossImports })
      const evidence = Array.of(crossImportsItem)

      return Advice.make({
        location,
        level: "directory",
        title: "leaked seam",
        remediation:
          "Two directories import each other, so the seam between them leaks in both directions. " +
          "Give the shared vocabulary one home so the dependency points one way.",
        evidence,
        examples: leakedSeamExamples
      })
    })
  }

  const leakedSeamAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const fileAdvice = fileLeakAdvice(elements)
    const directoryAdvice = directoryPairAdvice(elements)

    return Array.appendAll(fileAdvice, directoryAdvice)
  }

  const leakedSeam = deriveSignals(leakedSeamAdvice)
  // registrationCeremony: collocated because exclusive ownership keeps one Semantic Module.
  const registrationCeremonyExamples = makePackageExamples("registration-ceremony")
  const minimumImportCount = 15
  const minimumLowRefRatio = 0.8

  const registrationAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isImportUsageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(importUsagePolicy.name)
    )

    const usages = pipe(
      elements,
      Array.filter(isImportUsageElement),
      Array.filterMap(Function.flow(importUsageDataOf, Result.fromOption(Function.constVoid))),
      Array.filter((data: ImportUsageData) => !data.fromTest)
    )

    const importers = pipe(
      usages,
      Array.map(Struct.get<ImportUsageData, "importerWorkspacePath">("importerWorkspacePath")),
      Array.dedupe
    )

    return Array.filterMap(importers, (importerPath) => {
      const isAtImporter = flow(
        Struct.get<ImportUsageData, "importerWorkspacePath">("importerWorkspacePath"),
        strictEqual(importerPath)
      )

      const atImporter = Array.filter(usages, isAtImporter)

      const importCount = pipe(
        atImporter,
        Array.map(Struct.get<ImportUsageData, "specifier">("specifier")),
        Array.dedupe
      ).length

      const names = Array.flatMap(atImporter, Struct.get<ImportUsageData, "names">("names"))

      if (strictEqual(0)(names.length)) {
        return Result.failVoid
      }

      const isSingleUseCatalogEntry = (name: ImportedNameUsage) => {
        const hasFewReferences = name.referenceCount <= 2
        const isNotInvoked = strictEqual(0)(name.callCount)
        const conditions = Array.make(hasFewReferences, isNotInvoked)

        return Array.every(conditions, Boolean)
      }

      const lowRefNames = Array.countBy(names, isSingleUseCatalogEntry)
      const ratio = lowRefNames / names.length
      const importsBelowMinimum = importCount < minimumImportCount
      const ratioBelowMinimum = ratio < minimumLowRefRatio
      const minimumChecks = Array.make(importsBelowMinimum, ratioBelowMinimum)
      const isBelowMinimum = Array.some(minimumChecks, Boolean)

      if (isBelowMinimum) {
        return Result.failVoid
      }

      const location = Location.make({ path: importerPath })

      const importedModulesItem = EvidenceItem.make({
        measure: "imported-modules",
        count: importCount
      })

      const singleUseItem = EvidenceItem.make({ measure: "single-use-imports", count: lowRefNames })
      const evidence = Array.make(importedModulesItem, singleUseItem)

      const advice = Advice.make({
        location,
        level: "file",
        title: "registration ceremony",
        remediation:
          "A registration ceremony restates every Module once as an import and again as a collected entry. " +
          "Collapse it behind one authoring interface so adding an entry touches one file.",
        evidence,
        examples: registrationCeremonyExamples
      })

      return Result.succeed(advice)
    })
  }

  const registrationCeremony = deriveSignals(registrationAdvice)
  // testPastInterface: collocated because exclusive ownership keeps one Semantic Module.
  const testPastInterfaceExamples = makePackageExamples("test-past-interface")

  const deriveEdgesForSymbol = (
    edges: ReadonlyArray<WorkspaceImportEdge>,
    workspacePath: string,
    symbolName: string,
    fromTest: boolean
  ): ReadonlyArray<WorkspaceImportEdge> =>
    Array.filter(edges, (edge) => {
      const importsWorkspacePath = strictEqual(workspacePath)(edge.importedPath)
      const matchesTestOrigin = strictEqual(fromTest)(edge.fromTest)

      const usageHasSymbolName = flow(
        Struct.get<ImportedNameUsage, "name">("name"),
        strictEqual(symbolName)
      )

      const importsSymbol = Array.some(edge.names, usageHasSymbolName)
      const conditions = Array.make(importsWorkspacePath, matchesTestOrigin, importsSymbol)

      return Array.every(conditions, Boolean)
    })

  const crossTestCallCount = (edges: ReadonlyArray<WorkspaceImportEdge>, symbolName: string) => {
    const usageHasSymbolName = flow(
      Struct.get<ImportedNameUsage, "name">("name"),
      strictEqual(symbolName)
    )

    return pipe(
      edges,
      Array.flatMap(Struct.get<WorkspaceImportEdge, "names">("names")),
      Array.filter(usageHasSymbolName),
      Array.reduce(0, (total, usage) => total + usage.callCount)
    )
  }

  const workspaceTestOnlySymbols =
    (edges: ReadonlyArray<WorkspaceImportEdge>) =>
    (data: ExportSurfaceData): ReadonlyArray<ExportedSymbolUsage> =>
      Array.filter(data.symbols, (symbol) => {
        const crossProdImports = deriveEdgesForSymbol(edges, data.workspacePath, symbol.name, false)
        const crossTestImports = deriveEdgesForSymbol(edges, data.workspacePath, symbol.name, true)
        const inProjectProd = symbol.referencingFileCount - symbol.referencingTestFileCount
        const productionCallers = inProjectProd + crossProdImports.length
        const hasNoProductionCallers = strictEqual(0)(productionCallers)
        const hasCrossTestImports = crossTestImports.length > 0
        const conditions = Array.make(hasNoProductionCallers, hasCrossTestImports)

        return Array.every(conditions, Boolean)
      })

  const isSeamLeakageFromTest = Function.flow(
    seamLeakageDataOf,
    Option.exists(Struct.get<SeamLeakageData, "fromTest">("fromTest"))
  )

  const testPastInterfaceAdvice = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<Advice> => {
    const isTestOnlyExportElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(testOnlyExportsPolicy.name)
    )

    const isSeamLeakageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(seamLeakageEvidencePolicy.name)
    )

    const isExportSurfaceElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(exportSurfacePolicy.name)
    )

    const testOnlyExports = Array.filter(elements, isTestOnlyExportElement)

    const testImports = pipe(
      elements,
      Array.filter(isSeamLeakageElement),
      Array.filter(isSeamLeakageFromTest)
    )

    const edges = deriveWorkspaceImportEdges(elements)
    const exportSurfaces = Array.filter(elements, isExportSurfaceElement)
    const testOnlySymbolsOf = workspaceTestOnlySymbols(edges)

    const hasTestOnlySymbols = (element: NamedDetection) =>
      pipe(
        exportSurfaceDataOf(element),
        Option.exists((data: ExportSurfaceData) => {
          const symbols = testOnlySymbolsOf(data)

          return symbols.length > 0
        })
      )

    const programPaths = pipe(
      Array.appendAll(testOnlyExports, testImports),
      Array.map(
        flow(
          Struct.get<NamedDetection, "detection">("detection"),
          Struct.get<NamedDetection["detection"], "location">("location"),
          Struct.get<NamedDetection["detection"]["location"], "path">("path")
        )
      )
    )

    const workspacePaths = pipe(
      exportSurfaces,
      Array.filter(hasTestOnlySymbols),
      Array.map(
        flow(
          Struct.get<NamedDetection, "detection">("detection"),
          Struct.get<NamedDetection["detection"], "location">("location"),
          Struct.get<NamedDetection["detection"]["location"], "path">("path")
        )
      )
    )

    const paths = pipe(Array.appendAll(programPaths, workspacePaths), Array.dedupe)

    return Array.map(paths, (filePath) => {
      const hasPath = flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(filePath)
      )

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
              const crossTestImports = deriveEdgesForSymbol(
                edges,
                data.workspacePath,
                symbol.name,
                true
              )

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
      const location = Location.make({ path: filePath })

      const exportsItem = EvidenceItem.make({
        measure: testOnlyExportsPolicy.name,
        count: exportsAtPath.length + workspaceSymbolCount
      })

      const callsItem = EvidenceItem.make({ measure: "test-helper-calls", count: testCallCount })

      const importsItem = EvidenceItem.make({
        measure: "test-deep-imports",
        count: importsAtPath.length
      })

      const evidence = Array.make(exportsItem, callsItem, importsItem)

      return Advice.make({
        location,
        level: "file",
        title: "test past interface",
        remediation:
          "Tests and production callers must cross the same interface. Exercise observable behaviour through the public Module, " +
          "make test-only helpers private, and replace internal/source imports with the declared seam.",
        evidence,
        examples: testPastInterfaceExamples
      })
    })
  }

  const testPastInterface = deriveSignals(testPastInterfaceAdvice)

  // DependencyStructureAdvisers keeps direct exports together because they share evidence.
  class DependencyStructureAdvisers extends Data.Class<{
    readonly hubModuleExamples: typeof hubModuleExamples
    readonly hubModule: typeof hubModule
    readonly leakedSeamExamples: typeof leakedSeamExamples
    readonly leakedSeam: typeof leakedSeam
    readonly registrationCeremonyExamples: typeof registrationCeremonyExamples
    readonly registrationCeremony: typeof registrationCeremony
    readonly testPastInterfaceExamples: typeof testPastInterfaceExamples
    readonly testPastInterface: typeof testPastInterface
  }> {}

  return new DependencyStructureAdvisers({
    hubModuleExamples,
    hubModule,
    leakedSeamExamples,
    leakedSeam,
    registrationCeremonyExamples,
    registrationCeremony,
    testPastInterfaceExamples,
    testPastInterface
  })
}

export const {
  hubModuleExamples,
  hubModule,
  leakedSeamExamples,
  leakedSeam,
  registrationCeremonyExamples,
  registrationCeremony,
  testPastInterfaceExamples,
  testPastInterface
} = makeArchitectureExploreDependencyStructureAdvisers()
