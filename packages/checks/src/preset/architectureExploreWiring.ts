import { Array, Stream, pipe } from "effect"
import { makeWiring, silentCheck } from "@better-typescript/core/engine/report"
import type { NamedCheck, Signal, Wiring } from "@better-typescript/core/engine/report/data"
import { namedDetection } from "@better-typescript/core/engine/location"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"
import { passThroughWrappers } from "../checks/architectureExplore/passThroughWrappers.js"
import { interfaceBurden } from "../checks/architectureExplore/interfaceBurden.js"
import { moduleGraph } from "../checks/architectureExplore/moduleGraph.js"
import { testOnlyExports } from "../checks/architectureExplore/testOnlyExports.js"
import { seamLeakageEvidence } from "../checks/architectureExplore/seamLeakageEvidence.js"
import { externalDependencyConstruction } from "../checks/architectureExplore/externalDependencyConstruction.js"
import { singleAdapterSeams } from "../checks/architectureExplore/singleAdapterSeams.js"
import { deletionTestShallowness } from "../checks/architectureExplore/deletionTestShallowness.js"
import { wideShallowInterface } from "../checks/architectureExplore/wideShallowInterface.js"
import { bounceCluster } from "../checks/architectureExplore/bounceCluster.js"
import { leakedSeam } from "../checks/architectureExplore/leakedSeam.js"
import { testPastInterface } from "../checks/architectureExplore/testPastInterface.js"
import { hardToTestHotspot } from "../checks/architectureExplore/hardToTestHotspot.js"
import { hypotheticalSeam } from "../checks/architectureExplore/hypotheticalSeam.js"

const nameArchitectureExploreDetections = (
  signal: Signal
): Stream.Stream<NamedDetection, Error> => {
  const toNamedDetection = namedDetection(signal.name)

  return pipe(Stream.fromIterable(signal.detections), Stream.map(toNamedDetection))
}

const passThroughWrappersCheck = silentCheck("pass-through-wrappers", passThroughWrappers)

const interfaceBurdenCheck = silentCheck("interface-burden", interfaceBurden)

const moduleGraphCheck = silentCheck("module-graph", moduleGraph)

const testOnlyExportsCheck = silentCheck("test-only-exports", testOnlyExports)

const seamLeakageEvidenceCheck = silentCheck("seam-leakage-evidence", seamLeakageEvidence)

const externalDependencyConstructionCheck = silentCheck(
  "external-dependency-construction",
  externalDependencyConstruction
)

const singleAdapterSeamsCheck = silentCheck("single-adapter-seams", singleAdapterSeams)

export const architectureExploreChecks: ReadonlyArray<NamedCheck> = Array.make(
  passThroughWrappersCheck,
  interfaceBurdenCheck,
  moduleGraphCheck,
  testOnlyExportsCheck,
  seamLeakageEvidenceCheck,
  externalDependencyConstructionCheck,
  singleAdapterSeamsCheck
)

export const architectureExploreDerive = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<Advice, Error> => {
  const namedElements = pipe(
    Stream.fromIterable(signals),
    Stream.flatMap(nameArchitectureExploreDetections)
  )

  const deletionStream = deletionTestShallowness(namedElements)
  const wideStream = wideShallowInterface(namedElements)
  const bounceStream = bounceCluster(namedElements)
  const leakedStream = leakedSeam(namedElements)
  const testStream = testPastInterface(namedElements)
  const hardToTestStream = hardToTestHotspot(namedElements)
  const hypotheticalStream = hypotheticalSeam(namedElements)

  const adviceStreams = Array.make(
    deletionStream,
    wideStream,
    bounceStream,
    leakedStream,
    testStream,
    hardToTestStream,
    hypotheticalStream
  )

  return pipe(Stream.fromIterable(adviceStreams), Stream.flatten())
}

export const architectureExploreWiring: Wiring = makeWiring({
  checks: architectureExploreChecks,
  derive: architectureExploreDerive
})
