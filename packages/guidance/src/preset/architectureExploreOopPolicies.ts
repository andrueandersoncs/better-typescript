import { Tuple } from "effect"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { externalDependencyConstruction as externalDependencyConstructionMatcher } from "@better-typescript/matchers/builtins/externalDependencyConstruction"
import { singleAdapterSeams as singleAdapterSeamsMatcher } from "@better-typescript/matchers/builtins/singleAdapterSeams"

export const externalDependencyConstruction = makeBuiltinPolicy({
  name: "external-dependency-construction",
  matcher: externalDependencyConstructionMatcher,
  guidance: factGuidance(
    "External collaborator construction evidence — behaviour creates an imported collaborator away from the composition root.",
    "Architecture Explore classifies concentrated evidence before recommending a real seam with production and test adapters."
  ),
  reported: false,
  stage: "program"
})

export const singleAdapterSeams = makeBuiltinPolicy({
  name: "single-adapter-seams",
  matcher: singleAdapterSeamsMatcher,
  guidance: factGuidance(
    "Single-adapter seam evidence — this injected behavioural interface has one production adapter and no test adapter.",
    "One adapter is a hypothetical seam. Architecture Explore recommends removing the port until behaviour actually varies across production and test adapters."
  ),
  reported: false,
  stage: "program"
})

export const architectureExploreOopPolicies = Tuple.make(
  externalDependencyConstruction,
  singleAdapterSeams
)
