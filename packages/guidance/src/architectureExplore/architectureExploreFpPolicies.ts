import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { compositionForwarders } from "../policies/compositionForwarders.js"
import { moduleScopeEffects } from "../policies/moduleScopeEffects.js"
import { contextTagSeams } from "../policies/contextTagSeams.js"
import { compositionFingerprints } from "../policies/compositionFingerprints.js"

export const architectureExploreFpPolicies: ReadonlyArray<Policy> = Array.make(
  compositionForwarders,
  moduleScopeEffects,
  contextTagSeams,
  compositionFingerprints
)
