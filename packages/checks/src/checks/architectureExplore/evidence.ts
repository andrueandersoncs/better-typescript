import { Array, Data, Function, HashMap, Option, Result, Schema, Tuple, pipe } from "effect"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import {
  CompositionFingerprintData,
  CompositionForwarderData,
  ContextTagSeamData,
  ExportSurfaceData,
  ImportUsageData,
  ImportedNameUsage,
  InterfaceBurdenData,
  ModuleGraphData,
  ModuleIdentityData,
  PassThroughWrapperData,
  SeamLeakageData,
  TestOnlyExportData
} from "./data.js"
import {
  compositionForwardersName,
  importUsageName,
  moduleGraphName,
  moduleIdentityName,
  passThroughWrappersName
} from "./names.js"
import { isTestPath } from "./programSymbols.js"

const checkedData = <A>(
  guard: (input: unknown) => input is A,
  element: NamedDetection
): Option.Option<A> => {
  const data = element.detection.data

  return guard(data) ? Option.some(data) : Option.none()
}

export const passThroughDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(PassThroughWrapperData), element)

export const interfaceBurdenDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(InterfaceBurdenData), element)

export const moduleGraphDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(ModuleGraphData), element)

export const testOnlyExportDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(TestOnlyExportData), element)

export const seamLeakageDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(SeamLeakageData), element)

export const isDeletableWrapper = (element: NamedDetection) =>
  pipe(
    passThroughDataOf(element),
    Option.exists((data) => {
      const hasAtMostOneCaller = data.callerCount <= 1
      const hasOnlyCallReferences = !data.hasNonCallReference

      return hasAtMostOneCaller && hasOnlyCallReferences
    })
  )

export const importUsageDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(ImportUsageData), element)

export const exportSurfaceDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(ExportSurfaceData), element)

export const compositionForwarderDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(CompositionForwarderData), element)

export const contextTagSeamDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(ContextTagSeamData), element)

export const compositionFingerprintDataOf = (element: NamedDetection) =>
  checkedData(Schema.is(CompositionFingerprintData), element)

// Composition forwarders join the deletable set because FP wrappers carry the same judgment.
export const isDeletableComposition = (element: NamedDetection) =>
  pipe(
    compositionForwarderDataOf(element),
    Option.exists((data) => {
      const hasAtMostOneCaller = data.callerCount <= 1
      const hasOnlyCallReferences = !data.hasNonCallReference

      return hasAtMostOneCaller && hasOnlyCallReferences
    })
  )

export const isDeletableShallowness = (element: NamedDetection) =>
  isDeletableWrapper(element) || isDeletableComposition(element)

const shallownessNames = Array.make(passThroughWrappersName, compositionForwardersName)

export const isShallownessName = (name: string) => Array.contains(shallownessNames, name)

const directorySegments = (filePath: string): ReadonlyArray<string> => {
  const normalized = filePath.replaceAll("\\", "/")
  const separator = normalized.lastIndexOf("/")
  const directory = separator === -1 ? "." : normalized.slice(0, separator)

  return directory.split("/")
}

export const commonDirectory = (paths: ReadonlyArray<string>) => {
  const allSegments = Array.map(paths, directorySegments)
  const fallback = Array.of(".")
  const first = pipe(Array.head(allSegments), Option.getOrElse(Function.constant(fallback)))
  const remaining = Array.drop(allSegments, 1)

  const takeCommonPrefix = (prefix: ReadonlyArray<string>, segments: ReadonlyArray<string>) =>
    Array.takeWhile(prefix, (segment, index) => {
      const candidate = Array.get(segments, index)

      return Option.contains(candidate, segment)
    })

  const common = Array.reduce(remaining, first, takeCommonPrefix)

  return common.length === 0 ? "." : Array.join(common, "/")
}

// WorkspaceImportEdge is the joined cross-package edge because advisers need one shared graph.
export class WorkspaceImportEdge extends Data.Class<{
  readonly importerPath: string
  readonly importedPath: string
  readonly fromTest: boolean
  readonly names: ReadonlyArray<ImportedNameUsage>
}> {}

const emptyImportedNames: ReadonlyArray<ImportedNameUsage> = Array.empty()

const isModuleIdentityData = Schema.is(ModuleIdentityData)

const aliasEntriesOf = (element: NamedDetection): ReadonlyArray<readonly [string, string]> =>
  pipe(
    checkedData(isModuleIdentityData, element),
    Option.map((data) => {
      const pairWithWorkspace = (alias: string) => Tuple.make(alias, data.workspacePath)

      return Array.map(data.aliases, pairWithWorkspace)
    }),
    Option.getOrElse(Array.empty)
  )

const graphEdgesOf = (element: NamedDetection): ReadonlyArray<WorkspaceImportEdge> =>
  pipe(
    moduleGraphDataOf(element),
    Option.map((data) => {
      const fromTest = isTestPath(data.workspacePath)

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
    Option.flatMap((data) => {
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
export const workspaceImportEdges = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<WorkspaceImportEdge> => {
  const isModuleIdentityElement = (element: NamedDetection) => element.name === moduleIdentityName
  const isModuleGraphElement = (element: NamedDetection) => element.name === moduleGraphName
  const isImportUsageElement = (element: NamedDetection) => element.name === importUsageName
  const identityElements = Array.filter(elements, isModuleIdentityElement)
  const aliasEntries = Array.flatMap(identityElements, aliasEntriesOf)
  const aliasTable = HashMap.fromIterable(aliasEntries)
  const graphEdges = pipe(elements, Array.filter(isModuleGraphElement), Array.flatMap(graphEdgesOf))

  const usageEdges = pipe(
    elements,
    Array.filter(isImportUsageElement),
    Array.filterMap(Function.flow(usageEdgeOf(aliasTable), Result.fromOption(Function.constVoid)))
  )

  return Array.appendAll(graphEdges, usageEdges)
}
