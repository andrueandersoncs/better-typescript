import { Array, pipe } from "effect"
import type { Subscription } from "../../matcher/subscription.js"
import type { FunctionalCoreBoundaryData } from "./boundaryData.js"
import { functionalCoreEffectFeatures } from "./functionalCoreEffectFeatureCatalog.js"
import { withFunctionalCoreEffectIndex } from "./functionalCoreEffectIndexBuild.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"

const boundaryFacts = (index: FunctionalCoreEffectIndex) => {
  const boundaryFactsFor = (
    feature: (typeof functionalCoreEffectFeatures)[number]
  ): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> => feature.boundaryFacts(index)

  return pipe(functionalCoreEffectFeatures, Array.flatMap(boundaryFactsFor))
}

export const makeFunctionalCoreEffect = withFunctionalCoreEffectIndex(boundaryFacts)
