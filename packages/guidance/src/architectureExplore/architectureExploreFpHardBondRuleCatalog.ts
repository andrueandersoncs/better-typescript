import { Array } from "effect"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog.js"

// FP owns no paradigm Hard Bonds yet because those bonds ship separately.
const architectureExploreFpHardBondRules = Array.empty()

export const architectureExploreFpHardBondRuleCatalog: SemanticModuleHardBondRuleCatalog =
  Object.freeze(architectureExploreFpHardBondRules)
