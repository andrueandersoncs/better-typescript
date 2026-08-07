import { makeSilentBuiltinPolicy } from "../makeSilentBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { compositionFingerprints as compositionFingerprintsMatcher } from "@better-typescript/matchers/builtins/compositionFingerprints"

export const compositionFingerprints = makeSilentBuiltinPolicy(
  "composition-fingerprints",
  compositionFingerprintsMatcher,
  factGuidance(
    "Composition fingerprint evidence — this export orchestrates a repeatable call shape.",
    "Advice compares fingerprints across Modules because the same orchestration in two places is a missing operation."
  )
)
