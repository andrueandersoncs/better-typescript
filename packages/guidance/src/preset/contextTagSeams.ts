import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { contextTagSeams as contextTagSeamsMatcher } from "@better-typescript/matchers/builtins/contextTagSeams"

export const contextTagSeams = makeBuiltinPolicy({
  name: "context-tag-seams",
  matcher: contextTagSeamsMatcher,
  guidance: factGuidance(
    "Context-tag seam evidence — this Effect service key has production adapters, test adapters, and consumers.",
    "Architecture Explore uses adapter and consumer counts to judge whether an Effect seam earns its keep; counts alone are not a defect."
  ),
  reported: false,
  stage: "program"
})
