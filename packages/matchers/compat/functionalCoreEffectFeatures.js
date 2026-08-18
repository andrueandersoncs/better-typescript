import { Array, pipe } from "effect"
import { functionalCoreEffectFeatures } from "../dist/builtins/functionalCoreEffect/functionalCoreEffectFeatureCatalog.js"
export const functionalCoreBoundaryFacts = (index) =>
  pipe(
    functionalCoreEffectFeatures,
    Array.flatMap((feature) => feature.boundaryFacts(index))
  )
export const functionalCoreShapeFacts = (index) =>
  pipe(
    functionalCoreEffectFeatures,
    Array.flatMap((feature) => feature.shapeFacts(index))
  )
