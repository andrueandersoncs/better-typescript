import { makeArchitectureExplorePolicies } from "../preset/semanticModulePlacementPolicies.js"
import { architectureExploreFleetPolicies } from "../preset/architectureExploreFleetPolicies.js"
import { architectureExploreCatalogInputs } from "./architectureExploreCatalogInputs.js"

export const architectureExplorePolicies = makeArchitectureExplorePolicies(
  architectureExploreFleetPolicies,
  architectureExploreCatalogInputs
)
