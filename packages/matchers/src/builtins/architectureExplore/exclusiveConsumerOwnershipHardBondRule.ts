import { Array, Option, flow, pipe } from "effect"
import { buildOwnershipIndex } from "./buildOwnershipIndex.js"
import { exclusiveConsumerOwnershipEvidenceSchema } from "./exclusiveConsumerOwnershipEvidenceSchema.js"
import { ownershipCandidateAt } from "./ownershipCandidateAt.js"
import { SemanticModuleHardBondRule } from "./semanticModuleHardBondRule.js"

export const exclusiveConsumerOwnershipCandidates: SemanticModuleHardBondRule["candidates"] = (
  _context,
  _entities,
  referenceGraph
) => {
  const ownershipIndex = buildOwnershipIndex(referenceGraph)
  const candidateAt = ownershipCandidateAt(referenceGraph, ownershipIndex)
  const candidateArrayAt = flow(candidateAt, Option.toArray)

  return pipe(referenceGraph.components, Array.flatMap(candidateArrayAt))
}

export const exclusiveConsumerOwnershipHardBondRule = SemanticModuleHardBondRule.make({
  id: "exclusive-consumer-ownership",
  evidenceSchema: exclusiveConsumerOwnershipEvidenceSchema,
  candidates: exclusiveConsumerOwnershipCandidates
})
