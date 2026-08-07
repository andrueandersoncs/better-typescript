import { Data, HashMap } from "effect"

import type { ArchitectureRole } from "../../support/architectureRoleType.js"

import { EffectQualityPolicy } from "./effectQualityPolicy.js"

// EffectQualityIndex is shared program snapshot because policies query one role map.
export class EffectQualityIndex extends Data.Class<{
  readonly policy: EffectQualityPolicy
  readonly projectRoot: string
  readonly roles: HashMap.HashMap<string, ArchitectureRole>
}> {}
