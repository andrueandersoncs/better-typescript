import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"
import type { SemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
import { semanticModulePlacementName } from "@better-typescript/guidance/architectureExplore/architectureExploreDerive"

const detection = (
  path: string,
  line: number,
  column: number,
  data: SemanticModulePlacementData
): Detection =>
  Detection.make({
    location: Location.make({ path, line, column }),
    message: "message",
    hint: "hint",
    data
  })

export const placementElement = (
  path: string,
  line: number,
  column: number,
  data: SemanticModulePlacementData
) => makeNamedDetection(semanticModulePlacementName)(detection(path, line, column, data))
