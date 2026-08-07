import { architectureExploreIsTestPath } from "./architectureExploreIsTestPath.js"
import { Array, Function, HashMap, Option, Result, Schema, Struct, Tuple, flow, pipe } from "effect"
import type { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { ModuleIdentityData } from "@better-typescript/matchers/builtins/moduleIdentity"
import type { ImportedNameUsage } from "@better-typescript/matchers/builtins/architectureExplore/importedNameUsage"
import { WorkspaceImportEdge } from "./architectureExploreWorkspaceImportEdge.js"

const architectureExploreModuleGraphDataOf = (
  element: NamedDetection
): Option.Option<ModuleGraphData> =>
  Schema.is(ModuleGraphData)(element.detection.data)
    ? Option.some(element.detection.data)
    : Option.none()

// Graph and alias edges stay disjoint because project edges never carry bare package specifiers.
export const architectureExploreWorkspaceImportEdges = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<WorkspaceImportEdge> => {
  const moduleGraphName = "module-graph"
  const importUsageName = "import-usage"
  const moduleIdentityName = "module-identity"
  const emptyImportedNames: ReadonlyArray<ImportedNameUsage> = Array.empty()

  const checkedData = <A>(
    guard: (input: unknown) => input is A,
    element: NamedDetection
  ): Option.Option<A> =>
    guard(element.detection.data) ? Option.some(element.detection.data) : Option.none()

  const importUsageDataOf = (element: NamedDetection): Option.Option<ImportUsageData> =>
    checkedData(Schema.is(ImportUsageData), element)

  const isModuleIdentityData = Schema.is(ModuleIdentityData)

  const aliasEntriesOf = (element: NamedDetection): ReadonlyArray<readonly [string, string]> =>
    pipe(
      checkedData(isModuleIdentityData, element),
      Option.map((data: ModuleIdentityData) => {
        const pairWithWorkspace = (alias: string) => Tuple.make(alias, data.workspacePath)

        return Array.map(data.aliases, pairWithWorkspace)
      }),
      Option.getOrElse(Array.empty)
    )

  const graphEdgesOf = (element: NamedDetection): ReadonlyArray<WorkspaceImportEdge> =>
    pipe(
      architectureExploreModuleGraphDataOf(element),
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

  const isModuleIdentityElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(moduleIdentityName)
  )

  const isModuleGraphElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(moduleGraphName)
  )

  const isImportUsageElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(importUsageName)
  )

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
