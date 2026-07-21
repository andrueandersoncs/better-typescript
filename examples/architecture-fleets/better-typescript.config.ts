import { Option, pipe } from "effect"
import { defineConfig, makeWiring, makeMergedWiring } from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import {
  architectureExplorePolicies,
  architectureExploreWiring
} from "@better-typescript/guidance/preset/architectureExploreWiring"
import {
  ArchitectureRolePath,
  conventionalArchitectureRoleOf,
  roleByPrefixes
} from "@better-typescript/guidance/architectureRole"
import {
  defaultFunctionalCoreEffectPolicy,
  FunctionalCoreEffectPolicy
} from "@better-typescript/matchers/builtins/functionalCoreEffect/policy"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/guidance/preset/functionalCoreEffectWiring"

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
