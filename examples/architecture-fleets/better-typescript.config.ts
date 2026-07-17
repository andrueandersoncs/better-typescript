import { Effect, Option, pipe } from "effect"
import { defineConfig, makeWiring, mergeWirings } from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import {
  architectureExploreChecks,
  architectureExploreDerive
} from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  ArchitectureRolePath,
  FunctionalCoreEffectPolicy,
  conventionalArchitectureRoleOf,
  defaultFunctionalCoreEffectPolicy,
  roleByPrefixes
} from "@better-typescript/checks/functionalCoreEffect/policy"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"

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

const boundaryWiring = Effect.all({
  defaultWiring,
  functionalCoreEffectWiring: makeFunctionalCoreEffectWiring(layeredPolicy)
}).pipe(
  Effect.map(({ defaultWiring, functionalCoreEffectWiring }) =>
    mergeWirings([defaultWiring, functionalCoreEffectWiring])
  )
)

// The union evidence list pairs with the shared derive because advisers tolerate absent signals.
const exploreWiring = architectureExploreDerive.pipe(
  Effect.map((derive) =>
    makeWiring({
      checks: architectureExploreChecks,
      derive
    })
  )
)

export default Effect.all({ boundaryWiring, exploreWiring }).pipe(
  Effect.map(({ boundaryWiring, exploreWiring }) =>
    defineConfig([
      { files: ["lib/**", "src/**"], wiring: boundaryWiring },
      { files: ["**/*"], wiring: exploreWiring }
    ])
  )
)
