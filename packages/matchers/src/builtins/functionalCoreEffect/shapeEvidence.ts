import { withFunctionalCoreEffectIndex } from "./functionalCoreEffectIndexBuild.js"
import { functionalCoreShapeFacts } from "./functionalCoreEffectFeatures.js"

export const makeFunctionalCoreShapeEvidence =
  withFunctionalCoreEffectIndex(functionalCoreShapeFacts)
