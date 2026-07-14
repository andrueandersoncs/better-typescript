import { defineConfig } from "@better-typescript/core/engine/report"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"

export default defineConfig([
  { files: ["**/*"], wiring: architectureExploreWiring }
])
