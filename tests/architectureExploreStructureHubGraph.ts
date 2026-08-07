import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { detectionAt } from "./architectureExploreStructureDetectionAt.js"

export const hubGraph = (
  hubPath: string,
  importedWorkspacePaths: ReadonlyArray<string>
): Detection =>
  detectionAt(
    hubPath,
    2,
    ModuleGraphData.make({
      importedPaths: importedWorkspacePaths,
      workspacePath: hubPath,
      importedWorkspacePaths
    })
  )
