import { withFunctionalCoreEffectIndex } from "./functionalCoreEffectIndexBuild.js"
import { functionalCoreBoundaryFacts } from "./functionalCoreEffectFeatures.js"

export const makeFunctionalCoreEffect = withFunctionalCoreEffectIndex(functionalCoreBoundaryFacts)
