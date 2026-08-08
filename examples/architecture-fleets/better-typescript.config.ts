import { Option, pipe } from "effect"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { makeMergedWiring } from "@better-typescript/core/engine/wiring/makeMergedWiring"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"
import { architectureExplorePolicies } from "@better-typescript/guidance/architectureExplore/architectureExplorePolicies"
import {
  defaultFunctionalCoreEffectPolicy,
  roleByPrefixes
} from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"
import { FunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyClass"
import { ArchitectureRolePath } from "@better-typescript/matchers/support/architectureRolePath"
import { conventionalArchitectureRoleOf } from "@better-typescript/matchers/support/conventionalArchitectureRoleOf"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"

// This example is documentation for the opt-in architecture fleets. Copy it to
// a consumer project's better-typescript.config.ts to load it. It stays under
// examples/ so this repository's self-host run does not load it.
const prefixRoleOf = roleByPrefixes([
  new ArchitectureRolePath({ path: "lib/model", role: "domain" }),
  new ArchitectureRolePath({ path: "lib/contracts", role: "port" })
])

// Explicit prefixes win and the conventional classifier backfills because most paths follow it.
const roleOf = (candidatePath: string) =>
  pipe(
    prefixRoleOf(candidatePath),
    Option.orElse(() => conventionalArchitectureRoleOf(candidatePath))
  )

const layeredPolicy = new FunctionalCoreEffectPolicy({
  ...defaultFunctionalCoreEffectPolicy,
  roleOf
})

const boundaryWiring = makeMergedWiring([
  defaultWiring,
  makeFunctionalCoreEffectWiring(layeredPolicy)
])

// The union evidence list pairs with the shared derive because advisers tolerate absent signals.
const exploreWiring = makeWiring({
  policies: architectureExplorePolicies,
  derive: architectureExploreWiring.derive
})

export default defineConfig([
  { files: ["lib/**", "src/**"], wiring: boundaryWiring },
  { files: ["**/*"], wiring: exploreWiring }
])
