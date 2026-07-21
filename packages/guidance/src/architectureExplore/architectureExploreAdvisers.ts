import { Array } from "effect"
import { deletionTestShallowness } from "./deletionTestShallowness.js"
import { wideShallowInterface } from "./wideShallowInterface.js"
import { bounceCluster } from "./bounceCluster.js"
import { leakedSeam } from "./leakedSeam.js"
import { testPastInterface } from "./testPastInterface.js"
import { hardToTestHotspot } from "./hardToTestHotspot.js"
import { hypotheticalSeam } from "./hypotheticalSeam.js"
import { registrationCeremony } from "./registrationCeremony.js"
import { hubModule } from "./hubModule.js"
import { invisibleTests } from "./invisibleTests.js"
import { duplicatedOrchestration } from "./duplicatedOrchestration.js"

export const architectureExploreAdvisers = Array.make(
  deletionTestShallowness,
  wideShallowInterface,
  bounceCluster,
  leakedSeam,
  testPastInterface,
  hardToTestHotspot,
  hypotheticalSeam,
  registrationCeremony,
  hubModule,
  invisibleTests,
  duplicatedOrchestration
)
