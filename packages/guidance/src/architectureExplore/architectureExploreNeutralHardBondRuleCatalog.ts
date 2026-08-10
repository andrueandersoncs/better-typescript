import { Array } from "effect"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog.js"
import { exclusiveConsumerOwnershipHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/exclusiveConsumerOwnershipHardBondRule.js"
import { semanticReferenceCycleHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticReferenceCycleHardBondRule.js"
import { semanticSubjectOwnershipHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticSubjectOwnershipHardBondRule.js"

// Neutral owns placement-independent reference-graph laws because bonds stay shared.
const neutralHardBondRules = Array.make(
  semanticReferenceCycleHardBondRule,
  exclusiveConsumerOwnershipHardBondRule,
  semanticSubjectOwnershipHardBondRule
)

export const architectureExploreNeutralHardBondRuleCatalog: SemanticModuleHardBondRuleCatalog =
  Object.freeze(neutralHardBondRules)
