import { Array, Tuple } from "effect"
import {
  hardToTestHotspot,
  hypotheticalSeam,
  invisibleTests
} from "./architectureExploreTestabilityAdvisers.js"

const hardToTestHotspotEntry = Tuple.make(5, hardToTestHotspot)
const hypotheticalSeamEntry = Tuple.make(6, hypotheticalSeam)
const invisibleTestsEntry = Tuple.make(9, invisibleTests)

export const architectureExploreTestabilityAdviserCatalog = Array.make(
  hardToTestHotspotEntry,
  hypotheticalSeamEntry,
  invisibleTestsEntry
)
