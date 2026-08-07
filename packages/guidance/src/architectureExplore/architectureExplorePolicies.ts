import { makeArchitectureExplorePolicies } from "../preset/architectureExploreCorePolicies.js"
import { architectureExploreFleetPolicies } from "../preset/architectureExploreFleetPolicies.js"
import { architectureExploreCatalogInputs } from "./architectureExploreCatalogInputs.js"

export const architectureExplorePolicies = makeArchitectureExplorePolicies(
  architectureExploreFleetPolicies,
  architectureExploreCatalogInputs
)
