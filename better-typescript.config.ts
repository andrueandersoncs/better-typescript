import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"
import { effectQualityWiring } from "@better-typescript/guidance/effectQuality/advice"
import { selfHostArchitectureFiles, selfHostProductFiles } from "./selfHostFiles.js"
import { standardSelfHostWiring } from "./selfHostWiring.js"

export default defineConfig([
  { files: selfHostProductFiles, wiring: standardSelfHostWiring },
  { files: selfHostProductFiles, wiring: effectQualityWiring },
  { files: selfHostArchitectureFiles, wiring: architectureExploreWiring }
])
