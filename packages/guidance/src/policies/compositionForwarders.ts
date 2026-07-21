import { compositionForwarders as compositionForwardersMatcher } from "@better-typescript/matchers/builtins/compositionForwarders"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Composition forwarder evidence — this export threads parameters through a pipe or call chain without policy."

const hint =
  "Use caller count in Architecture Explore Advice: delete low-leverage indirection, but keep operations whose behaviour or naming would otherwise reappear across callers."

export const compositionForwarders = makeSilentBuiltinPolicy(
  "composition-forwarders",
  compositionForwardersMatcher,
  factGuidance(message, hint)
)
