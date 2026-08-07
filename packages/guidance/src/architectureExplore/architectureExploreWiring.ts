import { makeArchitectureExploreWiring } from "./architectureExploreDerive.js"
import { architectureExploreFleetPolicies } from "../preset/architectureExploreFleetPolicies.js"
import { architectureExploreCatalogInputs } from "./architectureExploreCatalogInputs.js"

export const architectureExploreWiring = makeArchitectureExploreWiring(
  architectureExploreFleetPolicies,
  architectureExploreCatalogInputs
)
