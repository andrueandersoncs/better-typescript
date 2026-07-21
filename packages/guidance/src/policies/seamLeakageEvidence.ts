import { seamLeakageEvidence as seamLeakageEvidenceMatcher } from "@better-typescript/matchers/builtins/seamLeakageEvidence"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Seam leakage evidence — this import reaches through an internal or package-source path."

const hint =
  "Route callers and tests through the Module's declared public interface so implementation layout can change locally."

export const seamLeakageEvidence = makeSilentBuiltinPolicy(
  "seam-leakage-evidence",
  seamLeakageEvidenceMatcher,
  factGuidance(message, hint)
)
