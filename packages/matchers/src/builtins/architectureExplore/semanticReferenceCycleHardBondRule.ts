import { Array, HashSet, pipe } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticModuleEvidence } from "./semanticModuleEvidence.js"
import { SemanticModuleHardBondCandidate } from "./semanticModuleHardBondCandidate.js"
import { SemanticModuleHardBondRule } from "./semanticModuleHardBondRule.js"
import { semanticEvidenceKey } from "./semanticEvidenceKey.js"
import { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"
import { portableKeyToken } from "./portableKeyToken.js"
import { semanticReferenceCycleEvidenceSchema } from "./semanticReferenceCycleEvidenceSchema.js"

const isInternalComponentReference =
  (componentTokens: HashSet.HashSet<string>) =>
  (reference: SemanticReferenceWitness): boolean => {
    const consumerToken = portableKeyToken(reference.consumer)
    const targetToken = portableKeyToken(reference.target)

    return HashSet.has(componentTokens, consumerToken) && HashSet.has(componentTokens, targetToken)
  }

const makePairCandidate =
  (evidenceKey: string) =>
  (evidence: SemanticModuleEvidence) =>
  (left: SemanticModuleEntityKey) =>
  (right: SemanticModuleEntityKey): SemanticModuleHardBondCandidate =>
    SemanticModuleHardBondCandidate.make({
      left,
      right,
      evidenceKey,
      evidence
    })

export const pairwiseComponentCandidates = (
  component: ReadonlyArray<SemanticModuleEntityKey>,
  referenceGraph: SemanticModuleReferenceGraph
): ReadonlyArray<SemanticModuleHardBondCandidate> => {
  const tokenList = Array.map(component, portableKeyToken)
  const componentTokens = HashSet.fromIterable(tokenList)

  const internalReferences = Array.filter(
    referenceGraph.references,
    isInternalComponentReference(componentTokens)
  )

  const evidence = semanticReferenceCycleEvidenceSchema.make({
    _tag: "semantic-reference-cycle",
    version: 1,
    component,
    internalReferences
  })

  const evidenceKey = semanticEvidenceKey(evidence)
  const makePair = makePairCandidate(evidenceKey)(evidence)

  return Array.flatMap(component, (left, leftIndex) => {
    const makePairForRight = makePair(left)

    return pipe(Array.drop(component, leftIndex + 1), Array.map(makePairForRight))
  })
}

export const semanticReferenceCycleCandidates: SemanticModuleHardBondRule["candidates"] = (
  _context,
  _entities,
  referenceGraph
) => {
  const pairwiseCandidatesForComponent = (component: ReadonlyArray<SemanticModuleEntityKey>) =>
    pairwiseComponentCandidates(component, referenceGraph)

  return pipe(
    referenceGraph.components,
    Array.filter((component) => component.length > 1),
    Array.flatMap(pairwiseCandidatesForComponent)
  )
}

export const semanticReferenceCycleHardBondRule = SemanticModuleHardBondRule.make({
  id: "semantic-reference-cycle",
  evidenceSchema: semanticReferenceCycleEvidenceSchema,
  candidates: semanticReferenceCycleCandidates
})
