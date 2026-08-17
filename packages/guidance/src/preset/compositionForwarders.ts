import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { compositionForwarders as compositionForwardersMatcher } from "@better-typescript/matchers/builtins/compositionForwarders"

export const compositionForwarders = makeBuiltinPolicy({
  name: "composition-forwarders",
  matcher: compositionForwardersMatcher,
  guidance: factGuidance(
    "Composition forwarder evidence — this export threads parameters through a pipe or call chain without policy.",
    "Use caller count in Architecture Explore Advice: delete low-leverage indirection, but keep operations whose behaviour or naming would otherwise reappear across callers."
  ),
  reported: false,
  stage: "program"
})
