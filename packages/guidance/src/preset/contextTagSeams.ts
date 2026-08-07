import { makeSilentBuiltinPolicy } from "../makeSilentBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { contextTagSeams as contextTagSeamsMatcher } from "@better-typescript/matchers/builtins/contextTagSeams"

export const contextTagSeams = makeSilentBuiltinPolicy(
  "context-tag-seams",
  contextTagSeamsMatcher,
  factGuidance(
    "Context-tag seam evidence — this Effect service key has production adapters, test adapters, and consumers.",
    "Architecture Explore uses adapter and consumer counts to judge whether an Effect seam earns its keep; counts alone are not a defect."
  )
)
