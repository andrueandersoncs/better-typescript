import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"
import { selfHostArchitectureFiles, selfHostProductFiles } from "./selfHostFiles.js"
import { productSelfHostWiring } from "./selfHostWiring.js"

export default defineConfig([
  { files: selfHostProductFiles, wiring: productSelfHostWiring },
  { files: selfHostArchitectureFiles, wiring: architectureExploreWiring }
])
