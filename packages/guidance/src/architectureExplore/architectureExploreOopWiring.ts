import { Array } from "effect"
import { architectureExploreNeutralHardBondRuleCatalog } from "./architectureExploreNeutralHardBondRuleCatalog.js"
import { architectureExploreOopHardBondRuleCatalog } from "./architectureExploreOopHardBondRuleCatalog.js"
import { architectureExploreOopPolicies } from "../preset/architectureExploreOopPolicies.js"
import { makeArchitectureExploreWiring } from "./architectureExploreDerive.js"

const architectureExploreOopCatalogInputs = Array.make(
  architectureExploreNeutralHardBondRuleCatalog,
  architectureExploreOopHardBondRuleCatalog
)

export const architectureExploreOopWiring = makeArchitectureExploreWiring(
  architectureExploreOopPolicies,
  architectureExploreOopCatalogInputs
)
