import { Array, HashMap, Option, Record, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { componentIndexByEntity } from "./componentIndexByEntity.js"
import { componentPositionForEntity } from "./componentPositionForEntity.js"
import { entityKeyEquivalence } from "./entityKeyEquivalence.js"
import { IndexedReference } from "./indexedReference.js"
import { OwnershipIndex } from "./ownershipIndex.js"
import { portableKeyToken } from "./portableKeyToken.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"
import type { semanticSubjectWitnessSchema as SemanticSubjectWitness } from "./semanticSubjectWitnessSchema.js"

const indexedReference =
  (indexByEntity: HashMap.HashMap<string, number>) =>
  (reference: SemanticReferenceWitness): Option.Option<IndexedReference> => {
    const positionFor = componentPositionForEntity(indexByEntity)
    const targetIndex = positionFor(reference.target)
    const consumerIndex = positionFor(reference.consumer)
    const indexes = Tuple.make(targetIndex, consumerIndex)

    const indexesDiffer = ([target, consumer]: readonly [number, number]) =>
      !strictEqual(consumer)(target)

    const makeIndexed = ([target, consumer]: readonly [number, number]) =>
      new IndexedReference({
        targetIndex: target,
        consumerIndex: consumer,
        reference
      })

    return pipe(Option.all(indexes), Option.filter(indexesDiffer), Option.map(makeIndexed))
  }

const indexedReferenceArray = (indexByEntity: HashMap.HashMap<string, number>) =>
  flow(indexedReference(indexByEntity), Option.toArray)

const targetIndexString = flow(Struct.get<IndexedReference, "targetIndex">("targetIndex"), String)

const indexedUnownedReference =
  (reference: SemanticModuleReferenceGraph["unownedConsumers"][number]) =>
  (targetIndex: number) => {
    const indexToken = String(targetIndex)

    return Tuple.make(indexToken, reference)
  }

const unownedTargetIndex =
  (indexByEntity: HashMap.HashMap<string, number>) =>
  (reference: SemanticModuleReferenceGraph["unownedConsumers"][number]) =>
    pipe(
      componentPositionForEntity(indexByEntity)(reference.target),
      Option.map(indexedUnownedReference(reference))
    )

const unownedTargetIndexArray = (indexByEntity: HashMap.HashMap<string, number>) =>
  flow(unownedTargetIndex(indexByEntity), Option.toArray)

const subjectEntry = (witness: SemanticSubjectWitness) => {
  const token = portableKeyToken(witness.operation)

  return Tuple.make(token, witness.subject)
}

const subjectsForComponent =
  (subjectByOperation: HashMap.HashMap<string, SemanticModuleEntityKey>) =>
  (component: ReadonlyArray<SemanticModuleEntityKey>) => {
    const subjectForToken = (token: string) => HashMap.get(subjectByOperation, token)

    const subjectForMember = (member: SemanticModuleEntityKey) =>
      pipe(member, portableKeyToken, subjectForToken, Option.toArray)

    return pipe(component, Array.flatMap(subjectForMember), Array.dedupeWith(entityKeyEquivalence))
  }

export const buildOwnershipIndex = (referenceGraph: SemanticModuleReferenceGraph) => {
  const indexByEntity = componentIndexByEntity(referenceGraph.components)

  const indexedReferences = Array.flatMap(
    referenceGraph.references,
    indexedReferenceArray(indexByEntity)
  )

  const incomingByTarget = Array.groupBy(indexedReferences, targetIndexString)

  const indexedUnowned = Array.flatMap(
    referenceGraph.unownedConsumers,
    unownedTargetIndexArray(indexByEntity)
  )

  const unownedByTarget = pipe(
    indexedUnowned,
    Array.groupBy(Tuple.get(0)),
    Record.map(Array.map(Tuple.get(1)))
  )

  const subjectByOperation = pipe(
    referenceGraph.subjects,
    Array.map(subjectEntry),
    HashMap.fromIterable
  )

  const subjectsByComponent = Array.map(
    referenceGraph.components,
    subjectsForComponent(subjectByOperation)
  )

  return new OwnershipIndex({ incomingByTarget, unownedByTarget, subjectsByComponent })
}
