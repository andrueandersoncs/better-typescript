import { Tuple } from "effect"
import { makeSilentBuiltinPolicy } from "../makeSilentBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { externalDependencyConstruction as externalDependencyConstructionMatcher } from "@better-typescript/matchers/builtins/externalDependencyConstruction"
import { singleAdapterSeams as singleAdapterSeamsMatcher } from "@better-typescript/matchers/builtins/singleAdapterSeams"

export const externalDependencyConstruction = makeSilentBuiltinPolicy(
  "external-dependency-construction",
  externalDependencyConstructionMatcher,
  factGuidance(
    "External collaborator construction evidence — behaviour creates an imported collaborator away from the composition root.",
    "Architecture Explore classifies concentrated evidence before recommending a real seam with production and test adapters."
  )
)

export const singleAdapterSeams = makeSilentBuiltinPolicy(
  "single-adapter-seams",
  singleAdapterSeamsMatcher,
  factGuidance(
    "Single-adapter seam evidence — this injected behavioural interface has one production adapter and no test adapter.",
    "One adapter is a hypothetical seam. Architecture Explore recommends removing the port until behaviour actually varies across production and test adapters."
  )
)

export const architectureExploreOopPolicies = Tuple.make(
  externalDependencyConstruction,
  singleAdapterSeams
)
