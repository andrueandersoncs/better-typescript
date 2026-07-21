import { moduleScopeEffects as moduleScopeEffectsMatcher } from "@better-typescript/matchers/builtins/moduleScopeEffects"
import { defineSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Module-scope effect evidence — this call runs effectful work outside an injectable seam."

const hint =
  "Architecture Explore classifies concentrated evidence before recommending a real seam with production and test adapters."

export const moduleScopeEffects = defineSilentBuiltinPolicy(
  "module-scope-effects",
  moduleScopeEffectsMatcher,
  factGuidance(message, hint)
)
