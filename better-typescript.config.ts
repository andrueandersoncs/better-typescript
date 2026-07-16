import { defineConfig, mergeWirings } from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  ArchitectureRolePath,
  policyWithRolePrefixes
} from "@better-typescript/checks/functionalCoreEffect/policy"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"

// Self-host with the default Effect fleet plus both opt-in architecture fleets.
// The presets stay separate because consumers choose either policy; this
// repository merges all three to exercise their integration continuously.
// Classify packages/core/src/engine as domain so wiring.ts there is not a false
// composition-root hit; model packages/cli/src as the real composition root.
const functionalCoreEffectPolicy = policyWithRolePrefixes([
  new ArchitectureRolePath({ path: "packages/core/src/engine", role: "domain" }),
  new ArchitectureRolePath({ path: "packages/cli/src", role: "root" })
])

const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(functionalCoreEffectPolicy)

const selfWiring = mergeWirings([
  defaultWiring,
  architectureExploreWiring,
  functionalCoreEffectWiring
])

export default defineConfig([{ files: ["**/*"], wiring: selfWiring }])
