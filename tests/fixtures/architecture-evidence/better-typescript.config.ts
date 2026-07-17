import { Effect } from "effect"
import { defineConfig } from "@better-typescript/core/engine/wiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"

export default architectureExploreWiring.pipe(
  Effect.map((wiring) =>
    defineConfig([
      { files: ["**/*"], wiring }
    ])
  )
)
