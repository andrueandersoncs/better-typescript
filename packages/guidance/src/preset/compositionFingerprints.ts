import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { compositionFingerprints as compositionFingerprintsMatcher } from "@better-typescript/matchers/builtins/compositionFingerprints"

export const compositionFingerprints = makeBuiltinPolicy({
  name: "composition-fingerprints",
  matcher: compositionFingerprintsMatcher,
  guidance: factGuidance(
    "Composition fingerprint evidence — this export orchestrates a repeatable call shape.",
    "Advice compares fingerprints across Modules because the same orchestration in two places is a missing operation."
  ),
  reported: false,
  stage: "program"
})
