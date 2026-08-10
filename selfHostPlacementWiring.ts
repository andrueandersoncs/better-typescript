import { Array, pipe } from "effect"
import type { Advice } from "@better-typescript/core/engine/derive/advice"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { semanticModulePlacementAdvice } from "@better-typescript/guidance/architectureExplore/architectureExploreDerive"
import { architectureExploreCatalogInputs } from "@better-typescript/guidance/architectureExplore/architectureExploreCatalogInputs"
import {
  semanticModulePlacement,
  unionHardBondRuleCatalogs
} from "@better-typescript/guidance/preset/semanticModulePlacementPolicies"

// Placement is silent, so self-host derives only its advice from its own detections.
const placementDerive = (signals: ReadonlyArray<Signal>): ReadonlyArray<Advice> => {
  const namedDetections = pipe(
    signals,
    Array.flatMap((signal) => Array.map(signal.detections, makeNamedDetection(signal.name)))
  )

  return semanticModulePlacementAdvice(namedDetections)
}

export const semanticModulePlacementSelfHostWiring = makeWiring({
  policies: [semanticModulePlacement(unionHardBondRuleCatalogs(architectureExploreCatalogInputs))],
  derive: placementDerive
})
