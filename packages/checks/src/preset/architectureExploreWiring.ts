import { Array, Stream, pipe } from "effect"
import { makeWiring, silentCheck } from "@better-typescript/core/engine/wiring"
import type { NamedCheck, Wiring } from "@better-typescript/core/engine/wiring/data"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { namedDetection } from "@better-typescript/core/engine/derive"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"
import * as names from "../checks/architectureExplore/names.js"
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
import { importUsage } from "../checks/architectureExplore/importUsage.js"
import { moduleIdentity } from "../checks/architectureExplore/moduleIdentity.js"
import { exportSurface } from "../checks/architectureExplore/exportSurface.js"
import { compositionForwarders } from "../checks/architectureExplore/compositionForwarders.js"
import { moduleScopeEffects } from "../checks/architectureExplore/moduleScopeEffects.js"
import { contextTagSeams } from "../checks/architectureExplore/contextTagSeams.js"
import { compositionFingerprints } from "../checks/architectureExplore/compositionFingerprints.js"
import { registrationCeremony } from "../checks/architectureExplore/registrationCeremony.js"
import { hubModule } from "../checks/architectureExplore/hubModule.js"
import { invisibleTests } from "../checks/architectureExplore/invisibleTests.js"
import { duplicatedOrchestration } from "../checks/architectureExplore/duplicatedOrchestration.js"

const nameArchitectureExploreDetections = (signal: Signal): Stream.Stream<NamedDetection> => {
  const toNamedDetection = namedDetection(signal.name)

  return pipe(Stream.fromIterable(signal.detections), Stream.map(toNamedDetection))
}

const passThroughWrappersCheck = silentCheck(names.passThroughWrappersName, passThroughWrappers)

const interfaceBurdenCheck = silentCheck(names.interfaceBurdenName, interfaceBurden)

const moduleGraphCheck = silentCheck(names.moduleGraphName, moduleGraph)

const testOnlyExportsCheck = silentCheck(names.testOnlyExportsName, testOnlyExports)

const seamLeakageEvidenceCheck = silentCheck(names.seamLeakageEvidenceName, seamLeakageEvidence)

const externalDependencyConstructionCheck = silentCheck(
  names.externalDependencyConstructionName,
  externalDependencyConstruction
)

const singleAdapterSeamsCheck = silentCheck(names.singleAdapterSeamsName, singleAdapterSeams)

const importUsageCheck = silentCheck(names.importUsageName, importUsage)

const moduleIdentityCheck = silentCheck(names.moduleIdentityName, moduleIdentity)

const exportSurfaceCheck = silentCheck(names.exportSurfaceName, exportSurface)

const compositionForwardersCheck = silentCheck(
  names.compositionForwardersName,
  compositionForwarders
)

const moduleScopeEffectsCheck = silentCheck(names.moduleScopeEffectsName, moduleScopeEffects)

const contextTagSeamsCheck = silentCheck(names.contextTagSeamsName, contextTagSeams)

const compositionFingerprintsCheck = silentCheck(
  names.compositionFingerprintsName,
  compositionFingerprints
)

// Paradigm-neutral evidence stays shared because both fleets join the same workspace graph.
export const architectureExploreCoreChecks: ReadonlyArray<NamedCheck> = Array.make(
  passThroughWrappersCheck,
  interfaceBurdenCheck,
  moduleGraphCheck,
  testOnlyExportsCheck,
  seamLeakageEvidenceCheck,
  importUsageCheck,
  moduleIdentityCheck,
  exportSurfaceCheck
)

// OOP evidence stays separate because constructor and implements seams are one paradigm's shape.
export const architectureExploreOopChecks: ReadonlyArray<NamedCheck> = Array.make(
  externalDependencyConstructionCheck,
  singleAdapterSeamsCheck
)

// FP evidence stays separate because curried pipes and Effect seams are the other paradigm's shape.
export const architectureExploreFpChecks: ReadonlyArray<NamedCheck> = Array.make(
  compositionForwardersCheck,
  moduleScopeEffectsCheck,
  contextTagSeamsCheck,
  compositionFingerprintsCheck
)

export const architectureExploreChecks: ReadonlyArray<NamedCheck> = pipe(
  architectureExploreCoreChecks,
  Array.appendAll(architectureExploreOopChecks),
  Array.appendAll(architectureExploreFpChecks)
)

export const architectureExploreDerive = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<Advice> => {
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
  const registrationStream = registrationCeremony(namedElements)
  const hubStream = hubModule(namedElements)
  const invisibleStream = invisibleTests(namedElements)
  const orchestrationStream = duplicatedOrchestration(namedElements)

  const adviceStreams = Array.make(
    deletionStream,
    wideStream,
    bounceStream,
    leakedStream,
    testStream,
    hardToTestStream,
    hypotheticalStream,
    registrationStream,
    hubStream,
    invisibleStream,
    orchestrationStream
  )

  return pipe(Stream.fromIterable(adviceStreams), Stream.flatten())
}

export const architectureExploreWiring: Wiring = makeWiring({
  checks: architectureExploreChecks,
  derive: architectureExploreDerive
})

// The OOP fleet composes neutral and constructor-shaped evidence because users opt into paradigms.
const architectureExploreOopFleetChecks = Array.appendAll(
  architectureExploreCoreChecks,
  architectureExploreOopChecks
)

export const architectureExploreOopWiring: Wiring = makeWiring({
  checks: architectureExploreOopFleetChecks,
  derive: architectureExploreDerive
})

// The FP fleet composes neutral and composition-shaped evidence because users opt into paradigms.
const architectureExploreFpFleetChecks = Array.appendAll(
  architectureExploreCoreChecks,
  architectureExploreFpChecks
)

export const architectureExploreFpWiring: Wiring = makeWiring({
  checks: architectureExploreFpFleetChecks,
  derive: architectureExploreDerive
})
