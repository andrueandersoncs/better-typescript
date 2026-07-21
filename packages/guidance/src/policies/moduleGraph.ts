import { moduleGraph as moduleGraphMatcher } from "@better-typescript/matchers/builtins/moduleGraph"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Module graph evidence — this Module imports other project Modules."

const hint =
  "Architecture Explore uses resolved edges to find connected bounce paths; an import count alone is not an architectural defect."

export const moduleGraph = makeSilentBuiltinPolicy(
  "module-graph",
  moduleGraphMatcher,
  factGuidance(message, hint)
)
