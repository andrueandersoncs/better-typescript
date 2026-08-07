import { Data } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleMembershipProofStep } from "./semanticModuleMembershipProofStep.js"

// ForestEdge is a directed bond edge because proof search walks forest adjacency.
export class ForestEdge extends Data.Class<{
  readonly neighbor: SemanticModuleEntityKey
  readonly step: SemanticModuleMembershipProofStep
}> {}
