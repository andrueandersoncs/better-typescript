import { defaultFunctionalCoreEffectPolicy } from "../checks/functionalCoreEffect/policy.js"
import { makeFunctionalCoreEffectWiring } from "../checks/functionalCoreEffect/wiring.js"

export const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
