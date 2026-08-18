import type { Subscription } from "../dist/matcher/subscription.js"
import type { FunctionalCoreBoundaryData } from "../dist/builtins/functionalCoreEffect/boundaryData.js"
import type { FunctionalCoreShapeData } from "../dist/builtins/functionalCoreEffect/shapeData.js"
import type { FunctionalCoreEffectIndex } from "../dist/builtins/functionalCoreEffect/functionalCoreEffectIndexClass.js"
export declare const functionalCoreBoundaryFacts: (
  index: FunctionalCoreEffectIndex
) => Array<Subscription<FunctionalCoreBoundaryData>>
export declare const functionalCoreShapeFacts: (
  index: FunctionalCoreEffectIndex
) => Array<Subscription<FunctionalCoreShapeData>>
