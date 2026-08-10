import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { semanticModulePlacementSelfHostWiring } from "./selfHostPlacementWiring.js"
import { selfHostArchitectureFiles, selfHostProductFiles } from "./selfHostFiles.js"
import { standardSelfHostWiring } from "./selfHostWiring.js"

export default defineConfig([
  { files: selfHostProductFiles, wiring: standardSelfHostWiring },
  { files: selfHostArchitectureFiles, wiring: semanticModulePlacementSelfHostWiring }
])
