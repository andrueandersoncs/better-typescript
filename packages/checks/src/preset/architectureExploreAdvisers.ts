import { Array } from "effect"
import { deletionTestShallowness } from "../checks/architectureExplore/deletionTestShallowness.js"
import { wideShallowInterface } from "../checks/architectureExplore/wideShallowInterface.js"
import { bounceCluster } from "../checks/architectureExplore/bounceCluster.js"
import { leakedSeam } from "../checks/architectureExplore/leakedSeam.js"
import { testPastInterface } from "../checks/architectureExplore/testPastInterface.js"
import { hardToTestHotspot } from "../checks/architectureExplore/hardToTestHotspot.js"
import { hypotheticalSeam } from "../checks/architectureExplore/hypotheticalSeam.js"
import { registrationCeremony } from "../checks/architectureExplore/registrationCeremony.js"
import { hubModule } from "../checks/architectureExplore/hubModule.js"
import { invisibleTests } from "../checks/architectureExplore/invisibleTests.js"
import { duplicatedOrchestration } from "../checks/architectureExplore/duplicatedOrchestration.js"

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
