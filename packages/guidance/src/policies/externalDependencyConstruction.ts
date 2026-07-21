import { externalDependencyConstruction as externalDependencyConstructionMatcher } from "@better-typescript/matchers/builtins/externalDependencyConstruction"
import { defineSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "External collaborator construction evidence — behaviour creates an imported collaborator away from the composition root."

const hint =
  "Architecture Explore classifies concentrated evidence before recommending a real seam with production and test adapters."

export const externalDependencyConstruction = defineSilentBuiltinPolicy(
  "external-dependency-construction",
  externalDependencyConstructionMatcher,
  factGuidance(message, hint)
)
