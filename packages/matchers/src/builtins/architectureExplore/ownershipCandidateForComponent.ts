import { Array, Option, pipe } from "effect"
import { buildOwnershipIndex } from "./buildOwnershipIndex.js"
import { componentIndexByEntity } from "./componentIndexByEntity.js"
import { componentPositionForEntity } from "./componentPositionForEntity.js"
import { ownershipCandidateAt } from "./ownershipCandidateAt.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"

export const ownershipCandidateForComponent =
  (referenceGraph: SemanticModuleReferenceGraph) =>
  (targetComponent: ReadonlyArray<SemanticModuleEntityKey>) => {
    const ownershipIndex = buildOwnershipIndex(referenceGraph)
    const indexByEntity = componentIndexByEntity(referenceGraph.components)
    const positionFor = componentPositionForEntity(indexByEntity)
    const targetIndex = pipe(targetComponent, Array.head, Option.flatMap(positionFor))
    const candidateAt = ownershipCandidateAt(referenceGraph, ownershipIndex)
    const candidateForIndex = (index: number) => candidateAt(targetComponent, index)

    return pipe(targetIndex, Option.flatMap(candidateForIndex))
  }
