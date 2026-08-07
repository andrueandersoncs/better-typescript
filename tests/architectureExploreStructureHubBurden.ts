import { InterfaceBurdenData } from "@better-typescript/matchers/builtins/interfaceBurdenData"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { detectionAt } from "./architectureExploreStructureDetectionAt.js"

export const hubBurden = (hubPath: string, operationCount: number): Detection =>
  detectionAt(
    hubPath,
    1,
    InterfaceBurdenData.make({
      operationCount,
      requiredParameterCount: 0,
      workspacePath: hubPath
    })
  )
