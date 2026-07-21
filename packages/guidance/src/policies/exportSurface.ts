import { exportSurface as exportSurfaceMatcher } from "@better-typescript/matchers/builtins/exportSurface"
import { defineSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Export surface evidence — this Module publishes symbols referenced outside the home file."

const hint =
  "Reference and call counts exclude the declaring file so deletion tests can weigh external consumers only."

export const exportSurface = defineSilentBuiltinPolicy(
  "export-surface",
  exportSurfaceMatcher,
  factGuidance(message, hint)
)
