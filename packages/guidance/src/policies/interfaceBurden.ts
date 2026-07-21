import { interfaceBurden as interfaceBurdenMatcher } from "@better-typescript/matchers/builtins/interfaceBurden"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Interface burden evidence — this Module exposes many callable operations or required parameters."

const hint =
  "Interface size is evidence, not a depth verdict. Architecture Explore combines it with low-leverage forwarding before recommending a smaller, deeper interface."

export const interfaceBurden = makeSilentBuiltinPolicy(
  "interface-burden",
  interfaceBurdenMatcher,
  factGuidance(message, hint)
)
