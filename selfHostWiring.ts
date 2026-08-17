import { makeMergedWiring } from "@better-typescript/core/engine/wiring/makeMergedWiring"
import { effectQualityWiring } from "@better-typescript/guidance/effectQuality/advice"
import { functionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"

export const productSelfHostWiring = makeMergedWiring([
  defaultWiring,
  functionalCoreEffectWiring,
  effectQualityWiring
])
