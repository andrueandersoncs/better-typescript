import { Effect } from "effect"
import { defineConfig, mergeWirings } from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  ArchitectureRolePath,
  policyWithRolePrefixes
} from "@better-typescript/checks/functionalCoreEffect/policy"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"

// Engine counts as domain and cli as root because wiring.ts must not look like a composition root.
const functionalCoreEffectPolicy = policyWithRolePrefixes([
  new ArchitectureRolePath({ path: "packages/core/src/engine", role: "domain" }),
  new ArchitectureRolePath({ path: "packages/cli/src", role: "root" })
])

const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(functionalCoreEffectPolicy)

// Reported style checks stay scoped to package sources because tests and fixtures are exempt surfaces.
const reportedWiring = Effect.all({
  defaultWiring,
  functionalCoreEffectWiring
}).pipe(
  Effect.map(({ defaultWiring, functionalCoreEffectWiring }) =>
    mergeWirings([defaultWiring, functionalCoreEffectWiring])
  )
)

// The architecture fleet spans the whole workspace because caller evidence lives in tests too.
export default Effect.all({
  reportedWiring,
  architectureExploreWiring
}).pipe(
  Effect.map(({ reportedWiring, architectureExploreWiring }) =>
    defineConfig([
      { files: ["packages/**"], wiring: reportedWiring },
      { files: ["**/*"], wiring: architectureExploreWiring }
    ])
  )
)
