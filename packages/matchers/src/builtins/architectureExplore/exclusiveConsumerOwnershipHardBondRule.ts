import {
  Array,
  Data,
  HashMap,
  HashSet,
  Option,
  Order,
  Record,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { entityKeyEquivalence } from "./entityKeyEquivalence.js"
import { exclusiveConsumerOwnershipEvidenceSchema } from "./exclusiveConsumerOwnershipEvidenceSchema.js"
import { portableKeyToken } from "./portableKeyToken.js"
import { semanticEvidenceKey } from "./semanticEvidenceKey.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleHardBondCandidate } from "./semanticModuleHardBondCandidate.js"
import { SemanticModuleHardBondRule } from "./semanticModuleHardBondRule.js"
import type { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"
import type { semanticSubjectWitnessSchema as SemanticSubjectWitness } from "./semanticSubjectWitnessSchema.js"

const exclusiveConsumerOwnershipCandidates: SemanticModuleHardBondRule["candidates"] = (
  _context,
  _entities,
  referenceGraph
) => {
  // IndexedReference joins graph evidence to component positions because grouping needs both facts.
  class IndexedReference extends Data.Class<{
    readonly consumerIndex: number
    readonly reference: SemanticReferenceWitness
    readonly targetIndex: number
  }> {}

  // OwnershipIndex stores each graph-wide lookup once because candidates share the same evidence.
  class OwnershipIndex extends Data.Class<{
    readonly incomingByTarget: Readonly<Record<string, ReadonlyArray<IndexedReference>>>
    readonly unownedByTarget: Readonly<
      Record<string, SemanticModuleReferenceGraph["unownedConsumers"]>
    >
    readonly subjectsByComponent: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>
  }> {}

  const componentPositionForEntity =
    (indexByEntity: HashMap.HashMap<string, number>) => (key: SemanticModuleEntityKey) => {
      const positionForToken = (token: string) => HashMap.get(indexByEntity, token)

      return pipe(key, portableKeyToken, positionForToken)
    }

  const componentIndexEntry = (componentIndex: number) => (member: SemanticModuleEntityKey) => {
    const token = portableKeyToken(member)

    return Tuple.make(token, componentIndex)
  }

  const componentIndexEntries = (
    component: ReadonlyArray<SemanticModuleEntityKey>,
    componentIndex: number
  ) => Array.map(component, componentIndexEntry(componentIndex))

  const componentIndexByEntity = (components: SemanticModuleReferenceGraph["components"]) =>
    pipe(components, Array.flatMap(componentIndexEntries), HashMap.fromIterable)

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

  const consumerIndexString = flow(
    Struct.get<IndexedReference, "consumerIndex">("consumerIndex"),
    String
  )

  const isStaticAggregationReference = (reference: IndexedReference) =>
    strictEqual("aggregation")(reference.reference.kind)

  const isCatalogAggregation = (references: ReadonlyArray<IndexedReference>) => {
    const targetIndexes = pipe(
      references,
      Array.map(Struct.get<IndexedReference, "targetIndex">("targetIndex")),
      Array.dedupe
    )

    const onlyAggregates = Array.every(references, isStaticAggregationReference)
    return onlyAggregates && targetIndexes.length > 1
  }

  const ownershipReferences = (references: ReadonlyArray<IndexedReference>) => {
    const referencesByConsumer = Array.groupBy(references, consumerIndexString)

    const catalogConsumerIndexes = pipe(
      referencesByConsumer,
      Record.toEntries,
      Array.filter(([, consumedReferences]) => isCatalogAggregation(consumedReferences)),
      Array.map(Tuple.get(0)),
      HashSet.fromIterable
    )

    const isOwnershipReference = (reference: IndexedReference) => {
      const consumerIndex = consumerIndexString(reference)

      return !HashSet.has(catalogConsumerIndexes, consumerIndex)
    }

    return Array.filter(references, isOwnershipReference)
  }

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

      return pipe(
        component,
        Array.flatMap(subjectForMember),
        Array.dedupeWith(entityKeyEquivalence)
      )
    }

  const buildOwnershipIndex = (referenceGraph: SemanticModuleReferenceGraph) => {
    const indexByEntity = componentIndexByEntity(referenceGraph.components)

    const indexedReferences = Array.flatMap(
      referenceGraph.references,
      indexedReferenceArray(indexByEntity)
    )

    const incomingByTarget = pipe(
      indexedReferences,
      ownershipReferences,
      Array.groupBy(targetIndexString)
    )

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

  const subjectTokens = (subjects: ReadonlyArray<SemanticModuleEntityKey>) =>
    pipe(subjects, Array.map(portableKeyToken), HashSet.fromIterable)

  const sharesSubjectWith = (targets: HashSet.HashSet<string>) => {
    const tokenIsTarget = (token: string) => HashSet.has(targets, token)

    return flow(portableKeyToken, tokenIsTarget)
  }

  // Ownership stops at a proven subject because implementation privacy cannot erase a boundary.
  const mergePreservesSubjectBoundaries =
    (targetSubjects: ReadonlyArray<SemanticModuleEntityKey>) =>
    (sourceSubjects: ReadonlyArray<SemanticModuleEntityKey>) => {
      const sourceTokens = subjectTokens(sourceSubjects)
      const targetTokens = subjectTokens(targetSubjects)
      const sharesSubject = Array.some(sourceSubjects, sharesSubjectWith(targetTokens))
      const sourceHasNoSubject = HashSet.isEmpty(sourceTokens)
      const targetHasNoSubject = HashSet.isEmpty(targetTokens)
      const eitherHasNoSubject = sourceHasNoSubject || targetHasNoSubject

      return eitherHasNoSubject || sharesSubject
    }

  const makeExclusiveOwnershipCandidate =
    (sourceComponent: ReadonlyArray<SemanticModuleEntityKey>) =>
    (targetComponent: ReadonlyArray<SemanticModuleEntityKey>) =>
    (consumerSubjects: ReadonlyArray<SemanticModuleEntityKey>) =>
    (targetSubjects: ReadonlyArray<SemanticModuleEntityKey>) =>
    (sourceComponents: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>) =>
    (unownedConsumers: SemanticModuleReferenceGraph["unownedConsumers"]) =>
    (witness: SemanticReferenceWitness) => {
      const evidence = exclusiveConsumerOwnershipEvidenceSchema.make({
        _tag: "exclusive-consumer-ownership",
        version: 2,
        sourceComponent,
        targetComponent,
        consumerSubjects,
        targetSubjects,
        incomingConsumerComponents: sourceComponents,
        unownedConsumers,
        witness
      })

      const evidenceKey = semanticEvidenceKey(evidence)

      return SemanticModuleHardBondCandidate.make({
        left: witness.consumer,
        right: witness.target,
        evidenceKey,
        evidence
      })
    }

  const valuesAt = <Value>(
    groups: Readonly<Record<string, ReadonlyArray<Value>>>,
    index: number
  ) => {
    const indexToken = String(index)

    return pipe(Record.get(groups, indexToken), Option.getOrElse(Array.empty<Value>))
  }

  const sourceComponentIndexes = (incomingReferences: ReadonlyArray<IndexedReference>) =>
    pipe(
      incomingReferences,
      Array.map(Struct.get<IndexedReference, "consumerIndex">("consumerIndex")),
      Array.dedupe,
      Array.sort(Order.Number)
    )

  const ownershipCandidateAt =
    (referenceGraph: SemanticModuleReferenceGraph, ownershipIndex: OwnershipIndex) =>
    (targetComponent: ReadonlyArray<SemanticModuleEntityKey>, targetIndex: number) => {
      const incomingReferences = valuesAt(ownershipIndex.incomingByTarget, targetIndex)
      const sourceIndexes = sourceComponentIndexes(incomingReferences)

      const sourceComponentAt = (sourceIndex: number) =>
        pipe(Array.get(referenceGraph.components, sourceIndex), Option.toArray)

      const sourceComponents = Array.flatMap(sourceIndexes, sourceComponentAt)
      const unownedConsumers = valuesAt(ownershipIndex.unownedByTarget, targetIndex)
      const hasSingleSource = strictEqual(1)(sourceComponents.length)
      const hasNoUnowned = strictEqual(0)(unownedConsumers.length)
      const exclusive = hasSingleSource && hasNoUnowned

      if (!exclusive) {
        return Option.none<SemanticModuleHardBondCandidate>()
      }

      const sourceIndexHead = Array.head(sourceIndexes)
      const sourceComponentHead = Array.head(sourceComponents)

      const incomingHead = pipe(
        incomingReferences,
        Array.head,
        Option.map(Struct.get<IndexedReference, "reference">("reference"))
      )

      const targetSubjects = pipe(
        ownershipIndex.subjectsByComponent,
        Array.get(targetIndex),
        Option.getOrElse(Array.empty<SemanticModuleEntityKey>)
      )

      const consumerSubjectsAt = (sourceIndex: number) =>
        Array.get(ownershipIndex.subjectsByComponent, sourceIndex)

      const consumerSubjects = pipe(sourceIndexHead, Option.flatMap(consumerSubjectsAt))

      const boundaryPreserving = Option.exists(
        consumerSubjects,
        mergePreservesSubjectBoundaries(targetSubjects)
      )

      if (!boundaryPreserving) {
        return Option.none<SemanticModuleHardBondCandidate>()
      }

      const candidateFor = (
        sourceComponent: ReadonlyArray<SemanticModuleEntityKey>,
        witness: SemanticReferenceWitness,
        consumerSubjectList: ReadonlyArray<SemanticModuleEntityKey>
      ) =>
        pipe(
          witness,
          makeExclusiveOwnershipCandidate(sourceComponent)(targetComponent)(consumerSubjectList)(
            targetSubjects
          )(sourceComponents)(unownedConsumers)
        )

      const candidateInputs = Tuple.make(sourceComponentHead, incomingHead, consumerSubjects)

      return pipe(
        Option.all(candidateInputs),
        Option.map(([sourceComponent, witness, consumerSubjectList]) =>
          candidateFor(sourceComponent, witness, consumerSubjectList)
        )
      )
    }

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
