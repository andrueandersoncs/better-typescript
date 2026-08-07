import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { compositionFingerprints } from "./compositionFingerprints.js"
import { compositionForwarders } from "./compositionForwarders.js"
import { contextTagSeams } from "./contextTagSeams.js"
import { moduleScopeEffects } from "./moduleScopeEffects.js"
import { architectureExploreOopPolicies } from "./architectureExploreOopPolicies.js"

// Fleet order is pinned because architectureExplorePolicies is a public report contract.
const architectureExploreFullFleetFpPolicies: ReadonlyArray<Policy> = Array.make(
  compositionForwarders,
  moduleScopeEffects,
  contextTagSeams,
  compositionFingerprints
)

export const architectureExploreFleetPolicies = Array.appendAll(
  architectureExploreOopPolicies,
  architectureExploreFullFleetFpPolicies
)
