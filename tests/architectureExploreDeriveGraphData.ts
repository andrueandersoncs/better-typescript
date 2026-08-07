import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"

export const graphData = (
  workspacePath: string,
  importedPaths: ReadonlyArray<string>
): ModuleGraphData =>
  ModuleGraphData.make({
    importedPaths: [...importedPaths],
    workspacePath,
    importedWorkspacePaths: [...importedPaths]
  })
