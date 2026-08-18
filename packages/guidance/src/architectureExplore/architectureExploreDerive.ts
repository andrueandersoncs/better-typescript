import { Array, Effect, Record } from "effect"

import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog.js"
import { makeArchitectureExplorePolicies } from "../preset/semanticModulePlacementPolicies.js"
import {
  bounceCluster,
  deletionTestShallowness,
  duplicatedOrchestration,
  wideShallowInterface
} from "./architectureExploreModuleShapeAdvisers.js"
import {
  hubModule,
  leakedSeam,
  registrationCeremony,
  testPastInterface
} from "./architectureExploreDependencyStructureAdvisers.js"
import {
  hardToTestHotspot,
  hypotheticalSeam,
  invisibleTests
} from "./architectureExploreTestabilityAdvisers.js"
import { semanticModulePlacementAdvice } from "./architectureExploreSemanticModulePlacementAdviser.js"

const architectureExploreAdviserCatalog = {
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
  duplicatedOrchestration,
  semanticModulePlacementAdvice
} as const

export const architectureExploreAdvisers = Record.values(architectureExploreAdviserCatalog)

const nameArchitectureExploreDetections = (signal: Signal) =>
  Array.map(signal.detections, makeNamedDetection(signal.name))

export const architectureExploreDerive = Effect.fn("ArchitectureExplore.derive")((
  signals: ReadonlyArray<Signal>
) => {
  const namedElements = Array.flatMap(signals, nameArchitectureExploreDetections)
  const adviceGroups = Array.map(architectureExploreAdvisers, (adviser) => adviser(namedElements))
  const advice = Array.flatten(adviceGroups)

  return Effect.succeed(advice)
})

export const makeArchitectureExploreWiring = (
  fleetPolicies: ReadonlyArray<Policy>,
  catalogInputs: ReadonlyArray<SemanticModuleHardBondRuleCatalog>
) => {
  const policies = makeArchitectureExplorePolicies(fleetPolicies, catalogInputs)

  return makeWiring({
    policies,
    derive: architectureExploreDerive
  })
}
