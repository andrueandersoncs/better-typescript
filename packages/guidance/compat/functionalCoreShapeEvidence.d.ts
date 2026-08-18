import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import type { FunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyClass"
export declare const makeFunctionalCoreShapeEvidencePolicy: (
  policy: FunctionalCoreEffectPolicy
) => Policy
export declare const functionalCoreShapeEvidence: Policy
