import {
  ArchitectureRolePath,
  conventionalArchitectureRoleOf,
  defaultFunctionalCoreEffectPolicy,
  policyWithRolePrefixes,
  roleByPrefixes,
  type ArchitectureRoleClassifier,
  type FunctionalCoreEffectPolicy
} from "../checks/functionalCoreEffect/policy.js"
import {
  functionalCoreEffectWiring,
  makeFunctionalCoreEffectWiring
} from "../checks/functionalCoreEffect/wiring.js"

export type { ArchitectureRoleClassifier, FunctionalCoreEffectPolicy }

export {
  ArchitectureRolePath,
  conventionalArchitectureRoleOf,
  defaultFunctionalCoreEffectPolicy,
  functionalCoreEffectWiring,
  makeFunctionalCoreEffectWiring,
  policyWithRolePrefixes,
  roleByPrefixes
}
