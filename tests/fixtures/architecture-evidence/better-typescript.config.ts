import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"

export default defineConfig([
  { files: ["**/*"], wiring: architectureExploreWiring }
])
