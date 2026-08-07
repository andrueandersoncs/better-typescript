import { Array } from "effect"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog.js"

// OOP owns no paradigm Hard Bonds yet because those bonds ship separately.
const architectureExploreOopHardBondRules = Array.empty()

export const architectureExploreOopHardBondRuleCatalog: SemanticModuleHardBondRuleCatalog =
  Object.freeze(architectureExploreOopHardBondRules)
