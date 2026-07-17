import { Array } from "effect"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { compositionForwarders } from "../checks/architectureExplore/compositionForwarders.js"
import { moduleScopeEffects } from "../checks/architectureExplore/moduleScopeEffects.js"
import { contextTagSeams } from "../checks/architectureExplore/contextTagSeams.js"
import { compositionFingerprints } from "../checks/architectureExplore/compositionFingerprints.js"

// FP evidence stays separate because curried pipes and Effect seams belong to that paradigm.
export const architectureExploreFpChecks: ReadonlyArray<NamedCheck> = Array.make(
  compositionForwarders,
  moduleScopeEffects,
  contextTagSeams,
  compositionFingerprints
)
