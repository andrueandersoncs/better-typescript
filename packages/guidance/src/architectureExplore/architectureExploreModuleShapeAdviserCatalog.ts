import { Array, Tuple } from "effect"
import {
  bounceCluster,
  deletionTestShallowness,
  duplicatedOrchestration,
  wideShallowInterface
} from "./architectureExploreModuleShapeAdvisers.js"

const deletionTestShallownessEntry = Tuple.make(0, deletionTestShallowness)
const wideShallowInterfaceEntry = Tuple.make(1, wideShallowInterface)
const bounceClusterEntry = Tuple.make(2, bounceCluster)
const duplicatedOrchestrationEntry = Tuple.make(10, duplicatedOrchestration)

export const architectureExploreModuleShapeAdviserCatalog = Array.make(
  deletionTestShallownessEntry,
  wideShallowInterfaceEntry,
  bounceClusterEntry,
  duplicatedOrchestrationEntry
)
