import { Array, pipe } from "effect"
import type { Subscription } from "../../matcher/subscription.js"
import { functionalCoreEffectFeatures } from "./functionalCoreEffectFeatureCatalog.js"
import { withFunctionalCoreEffectIndex } from "./functionalCoreEffectIndexBuild.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import type { FunctionalCoreShapeData } from "./shapeData.js"

const shapeFacts = (index: FunctionalCoreEffectIndex) => {
  const shapeFactsFor = (
    feature: (typeof functionalCoreEffectFeatures)[number]
  ): ReadonlyArray<Subscription<FunctionalCoreShapeData>> => feature.shapeFacts(index)

  return pipe(functionalCoreEffectFeatures, Array.flatMap(shapeFactsFor))
}

export const makeFunctionalCoreShapeEvidence = withFunctionalCoreEffectIndex(shapeFacts)
