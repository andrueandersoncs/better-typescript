import { Array, HashSet, Option, Order, Record, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { exclusiveConsumerOwnershipEvidenceSchema } from "./exclusiveConsumerOwnershipEvidenceSchema.js"
import type { IndexedReference } from "./indexedReference.js"
import type { OwnershipIndex } from "./ownershipIndex.js"
import { portableKeyToken } from "./portableKeyToken.js"
import { semanticEvidenceKey } from "./semanticEvidenceKey.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleHardBondCandidate } from "./semanticModuleHardBondCandidate.js"
import type { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"

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

const valuesAt = <Value>(groups: Readonly<Record<string, ReadonlyArray<Value>>>, index: number) => {
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

export const ownershipCandidateAt =
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
