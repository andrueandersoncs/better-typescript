import { Array, Tuple } from "effect"
import {
  hubModule,
  leakedSeam,
  registrationCeremony,
  testPastInterface
} from "./architectureExploreDependencyStructureAdvisers.js"

const leakedSeamEntry = Tuple.make(3, leakedSeam)
const testPastInterfaceEntry = Tuple.make(4, testPastInterface)
const registrationCeremonyEntry = Tuple.make(7, registrationCeremony)
const hubModuleEntry = Tuple.make(8, hubModule)

export const architectureExploreDependencyStructureAdviserCatalog = Array.make(
  leakedSeamEntry,
  testPastInterfaceEntry,
  registrationCeremonyEntry,
  hubModuleEntry
)
