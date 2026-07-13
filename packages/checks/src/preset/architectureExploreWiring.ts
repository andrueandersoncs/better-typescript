import { Array, Stream, pipe } from "effect"
import {
  makeWiring,
  namedCheck,
  silentCheck
} from "@better-typescript/core/engine/report"
import type {
  NamedCheck,
  Signal,
  Wiring
} from "@better-typescript/core/engine/report/data"
import { namedDetection } from "@better-typescript/core/engine/derive"
import type {
  Advice,
  NamedDetection
} from "@better-typescript/core/engine/derive/data"
import {
  passThroughWrappers,
  passThroughWrappersExamples
} from "../checks/architectureExplore/passThroughWrappers.js"
import {
  wideThinExports,
  wideThinExportsExamples
} from "../checks/architectureExplore/wideThinExports.js"
import {
  importCallGraph,
  importCallGraphExamples
} from "../checks/architectureExplore/importCallGraph.js"
import {
  singleUsePureExport,
  singleUsePureExportExamples
} from "../checks/architectureExplore/singleUsePureExport.js"
import {
  seamLeakageEvidence,
  seamLeakageEvidenceExamples
} from "../checks/architectureExplore/seamLeakageEvidence.js"
import {
  hardwiredDependencies,
  hardwiredDependenciesExamples
} from "../checks/architectureExplore/hardwiredDependencies.js"
import { deletionTestShallowness } from "../checks/architectureExplore/deletionTestShallowness.js"
import { bounceCluster } from "../checks/architectureExplore/bounceCluster.js"
import { leakedSeam } from "../checks/architectureExplore/leakedSeam.js"
import { hardToTestHotspot } from "../checks/architectureExplore/hardToTestHotspot.js"

const nameArchitectureExploreDetections = (
  signal: Signal
): Stream.Stream<NamedDetection, Error> => {
  const toNamedDetection = namedDetection(signal.name)

  return pipe(
    Stream.fromIterable(signal.detections),
    Stream.map(toNamedDetection)
  )
}

const passThroughWrappersCheck = silentCheck(
  "pass-through-wrappers",
  passThroughWrappers,
  passThroughWrappersExamples
)

const wideThinExportsCheck = silentCheck(
  "wide-thin-exports",
  wideThinExports,
  wideThinExportsExamples
)

const importCallGraphCheck = silentCheck(
  "import-call-graph",
  importCallGraph,
  importCallGraphExamples
)

const singleUsePureExportCheck = silentCheck(
  "single-use-pure-export",
  singleUsePureExport,
  singleUsePureExportExamples
)

const seamLeakageEvidenceCheck = silentCheck(
  "seam-leakage-evidence",
  seamLeakageEvidence,
  seamLeakageEvidenceExamples
)

const hardwiredDependenciesCheck = namedCheck(
  "hardwired-dependencies",
  hardwiredDependencies,
  hardwiredDependenciesExamples
)

export const architectureExploreChecks: ReadonlyArray<NamedCheck> = Array.make(
  passThroughWrappersCheck,
  wideThinExportsCheck,
  importCallGraphCheck,
  singleUsePureExportCheck,
  seamLeakageEvidenceCheck,
  hardwiredDependenciesCheck
)

export const architectureExploreDerive = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<Advice, Error> => {
  const signalStream = Stream.fromIterable(signals)

  const namedElements = pipe(
    signalStream,
    Stream.flatMap(nameArchitectureExploreDetections)
  )

  const deletionStream = deletionTestShallowness(namedElements)
  const bounceStream = bounceCluster(namedElements)
  const leakedStream = leakedSeam(namedElements)
  const hardToTestStream = hardToTestHotspot(namedElements)

  const adviceStreams = Array.make(
    deletionStream,
    bounceStream,
    leakedStream,
    hardToTestStream
  )

  return pipe(Stream.fromIterable(adviceStreams), Stream.flatten())
}

export const architectureExploreWiring: Wiring = makeWiring({
  checks: architectureExploreChecks,
  derive: architectureExploreDerive
})
