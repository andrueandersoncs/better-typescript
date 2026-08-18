import { defaultFunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"
import { makeFunctionalCoreEffectWiring } from "../dist/functionalCoreEffect/advice.js"
export const makeFunctionalCoreShapeEvidencePolicy = (policy) =>
  makeFunctionalCoreEffectWiring(policy).policies[1]
export const functionalCoreShapeEvidence = makeFunctionalCoreShapeEvidencePolicy(
  defaultFunctionalCoreEffectPolicy
)
