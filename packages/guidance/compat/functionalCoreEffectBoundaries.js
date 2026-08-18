import { defaultFunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"
import { makeFunctionalCoreEffectWiring } from "../dist/functionalCoreEffect/advice.js"
export const makeFunctionalCoreEffectBoundaries = (policy) =>
  makeFunctionalCoreEffectWiring(policy).policies[0]
export const functionalCoreEffectBoundaries = makeFunctionalCoreEffectBoundaries(
  defaultFunctionalCoreEffectPolicy
)
