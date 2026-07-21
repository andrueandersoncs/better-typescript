import { compositionFingerprints as compositionFingerprintsMatcher } from "@better-typescript/matchers/builtins/compositionFingerprints"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Composition fingerprint evidence — this export orchestrates a repeatable call shape."

const hint =
  "Advice compares fingerprints across Modules because the same orchestration in two places is a missing operation."

export const compositionFingerprints = makeSilentBuiltinPolicy(
  "composition-fingerprints",
  compositionFingerprintsMatcher,
  factGuidance(message, hint)
)
