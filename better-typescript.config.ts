import { Stream, pipe } from "effect"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/report"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import { functionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"

// Reported style checks stay scoped to package sources because tests and fixtures are exempt surfaces.
const reportedWiring = makeWiring({
  checks: [...defaultWiring.checks, ...functionalCoreEffectWiring.checks],
  derive: (signals) =>
    pipe(defaultWiring.derive(signals), Stream.concat(functionalCoreEffectWiring.derive(signals)))
})

// The architecture fleet spans the whole workspace because caller evidence lives in tests too.
export default defineConfig([
  { files: ["packages/**"], wiring: reportedWiring },
  { files: ["**/*"], wiring: architectureExploreWiring }
])
