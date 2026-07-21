import { Array, pipe } from "effect"
import { makeWiring } from "@better-typescript/core/engine/wiring"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { architectureExploreCorePolicies } from "../architectureExplore/architectureExploreCorePolicies.js"
import { architectureExploreOopPolicies } from "../architectureExplore/architectureExploreOopPolicies.js"
import { architectureExploreFpPolicies } from "../architectureExplore/architectureExploreFpPolicies.js"
import { architectureExploreDerive } from "../architectureExplore/architectureExploreDerive.js"

export const architectureExplorePolicies: ReadonlyArray<Policy> = pipe(
  architectureExploreCorePolicies,
  Array.appendAll(architectureExploreOopPolicies),
  Array.appendAll(architectureExploreFpPolicies)
)

export const architectureExploreWiring = makeWiring({
  policies: architectureExplorePolicies,
  derive: architectureExploreDerive
})

// The OOP fleet composes neutral and constructor-shaped evidence because users opt into paradigms.
const architectureExploreOopFleetPolicies = Array.appendAll(
  architectureExploreCorePolicies,
  architectureExploreOopPolicies
)

export const architectureExploreOopWiring = makeWiring({
  policies: architectureExploreOopFleetPolicies,
  derive: architectureExploreDerive
})

// The FP fleet composes neutral and composition-shaped evidence because users opt into paradigms.
const architectureExploreFpFleetPolicies = Array.appendAll(
  architectureExploreCorePolicies,
  architectureExploreFpPolicies
)

export const architectureExploreFpWiring = makeWiring({
  policies: architectureExploreFpFleetPolicies,
  derive: architectureExploreDerive
})
