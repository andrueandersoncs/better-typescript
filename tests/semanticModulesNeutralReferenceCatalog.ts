import { Array } from "effect"
import { exclusiveConsumerOwnershipHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/exclusiveConsumerOwnershipHardBondRule"
import { semanticReferenceCycleHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticReferenceCycleHardBondRule"
import { semanticSubjectOwnershipHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticSubjectOwnershipHardBondRule"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog"

export const neutralReferenceCatalog: SemanticModuleHardBondRuleCatalog = Object.freeze(
  Array.make(
    semanticReferenceCycleHardBondRule,
    exclusiveConsumerOwnershipHardBondRule,
    semanticSubjectOwnershipHardBondRule
  )
)
