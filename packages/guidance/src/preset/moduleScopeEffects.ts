import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { moduleScopeEffects as moduleScopeEffectsMatcher } from "@better-typescript/matchers/builtins/moduleScopeEffects"

export const moduleScopeEffects = makeBuiltinPolicy({
  name: "module-scope-effects",
  matcher: moduleScopeEffectsMatcher,
  guidance: factGuidance(
    "Module-scope effect evidence — this call runs effectful work outside an injectable seam.",
    "Architecture Explore classifies concentrated evidence before recommending a real seam with production and test adapters."
  ),
  reported: false,
  stage: "program"
})
