import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { architectureExploreNeutralHardBondRuleCatalog } from "./architectureExploreNeutralHardBondRuleCatalog.js"
import { architectureExploreFpHardBondRuleCatalog } from "./architectureExploreFpHardBondRuleCatalog.js"
import { makeArchitectureExploreWiring } from "./architectureExploreDerive.js"
import { compositionFingerprints } from "../preset/compositionFingerprints.js"
import { compositionForwarders } from "../preset/compositionForwarders.js"
import { contextTagSeams } from "../preset/contextTagSeams.js"
import { moduleScopeEffects } from "../preset/moduleScopeEffects.js"

export const architectureExploreFpPolicies: ReadonlyArray<Policy> = Array.make(
  compositionFingerprints,
  compositionForwarders,
  contextTagSeams,
  moduleScopeEffects
)

const architectureExploreFpCatalogInputs = Array.make(
  architectureExploreNeutralHardBondRuleCatalog,
  architectureExploreFpHardBondRuleCatalog
)

export const architectureExploreFpWiring = makeArchitectureExploreWiring(
  architectureExploreFpPolicies,
  architectureExploreFpCatalogInputs
)
