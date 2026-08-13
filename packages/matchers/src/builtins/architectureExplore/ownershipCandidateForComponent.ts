import { Array, Option, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import { buildOwnershipIndex } from "./buildOwnershipIndex.js"
import { componentToken } from "./componentToken.js"
import { ownershipCandidateAt } from "./ownershipCandidateAt.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"

export const ownershipCandidateForComponent =
  (referenceGraph: SemanticModuleReferenceGraph) =>
  (targetComponent: ReadonlyArray<SemanticModuleEntityKey>) => {
    const ownershipIndex = buildOwnershipIndex(referenceGraph)
    const expectedToken = componentToken(targetComponent)
    const tokenMatches = strictEqual(expectedToken)

    const componentMatches = (component: ReadonlyArray<SemanticModuleEntityKey>) =>
      pipe(component, componentToken, tokenMatches)

    const targetIndex = Array.findFirstIndex(referenceGraph.components, componentMatches)
    const candidateAt = ownershipCandidateAt(referenceGraph, ownershipIndex)
    const candidateForIndex = (index: number) => candidateAt(targetComponent, index)

    return pipe(targetIndex, Option.flatMap(candidateForIndex))
  }
