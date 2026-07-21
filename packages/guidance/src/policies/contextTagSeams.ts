import { contextTagSeams as contextTagSeamsMatcher } from "@better-typescript/matchers/builtins/contextTagSeams"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Context-tag seam evidence — this Effect service key has production adapters, test adapters, and consumers."

const hint =
  "Architecture Explore uses adapter and consumer counts to judge whether an Effect seam earns its keep; counts alone are not a defect."

export const contextTagSeams = makeSilentBuiltinPolicy(
  "context-tag-seams",
  contextTagSeamsMatcher,
  factGuidance(message, hint)
)
