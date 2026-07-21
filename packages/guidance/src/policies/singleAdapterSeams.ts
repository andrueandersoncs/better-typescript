import { singleAdapterSeams as singleAdapterSeamsMatcher } from "@better-typescript/matchers/builtins/singleAdapterSeams"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Single-adapter seam evidence — this injected behavioural interface has one production adapter and no test adapter."

const hint =
  "One adapter is a hypothetical seam. Architecture Explore recommends removing the port until behaviour actually varies across production and test adapters."

export const singleAdapterSeams = makeSilentBuiltinPolicy(
  "single-adapter-seams",
  singleAdapterSeamsMatcher,
  factGuidance(message, hint)
)
