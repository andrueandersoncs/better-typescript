import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"
import type { SemanticReferenceWitness } from "@better-typescript/matchers/builtins/architectureExplore/semanticReferenceWitness"
import { exclusiveConsumerOwnershipEntityKey } from "./exclusiveConsumerOwnershipEntityKey.js"

export const exclusiveConsumerOwnershipReference = (
  consumer: SemanticModuleEntityKey,
  target: SemanticModuleEntityKey,
  start: number,
  kind: SemanticReferenceWitness["kind"] = "call"
): SemanticReferenceWitness => ({
  consumer,
  target,
  reference: exclusiveConsumerOwnershipEntityKey(start),
  kind
})
