import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { detectionAt } from "./architectureExploreStructureDetectionAt.js"

export const callerGraph = (callerPath: string, hubPath: string): Detection =>
  detectionAt(
    callerPath,
    1,
    ModuleGraphData.make({
      importedPaths: [hubPath],
      workspacePath: callerPath,
      importedWorkspacePaths: [hubPath]
    })
  )
