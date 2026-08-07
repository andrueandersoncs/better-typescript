import { Data, HashMap } from "effect"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import type { FunctionalCoreEffectPolicy } from "./functionalCoreEffectPolicyClass.js"

// FunctionalCoreEffectIndex is shared program snapshot because checks must query one role map.
export class FunctionalCoreEffectIndex extends Data.Class<{
  readonly policy: FunctionalCoreEffectPolicy
  readonly projectRoot: string
  readonly roles: HashMap.HashMap<string, ArchitectureRole>
}> {}
