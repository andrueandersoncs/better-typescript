import { Array } from "effect"
import { SemanticModuleHardBondCandidate } from "./semanticModuleHardBondCandidate.js"
import { SemanticModuleHardBondRule } from "./semanticModuleHardBondRule.js"
import { semanticEvidenceKey } from "./semanticEvidenceKey.js"
import { semanticSubjectOwnershipEvidenceSchema } from "./semanticSubjectOwnershipEvidenceSchema.js"
import type { semanticSubjectWitnessSchema as SemanticSubjectWitness } from "./semanticSubjectWitnessSchema.js"

// Subject bonds ship engine-resolved facts because rules cannot re-run the TypeChecker.
const makeSubjectCandidate = (witness: SemanticSubjectWitness): SemanticModuleHardBondCandidate => {
  const evidence = semanticSubjectOwnershipEvidenceSchema.make({
    _tag: "semantic-subject-ownership",
    version: 1,
    operation: witness.operation,
    subject: witness.subject,
    derivation: witness.derivation,
    anchor: witness.anchor
  })

  const evidenceKey = semanticEvidenceKey(evidence)

  return SemanticModuleHardBondCandidate.make({
    left: witness.operation,
    right: witness.subject,
    evidenceKey,
    evidence
  })
}

const semanticSubjectOwnershipCandidates: SemanticModuleHardBondRule["candidates"] = (
  _context,
  _entities,
  referenceGraph
) => Array.map(referenceGraph.subjects, makeSubjectCandidate)

export const semanticSubjectOwnershipHardBondRule = SemanticModuleHardBondRule.make({
  id: "semantic-subject-ownership",
  evidenceSchema: semanticSubjectOwnershipEvidenceSchema,
  candidates: semanticSubjectOwnershipCandidates
})
