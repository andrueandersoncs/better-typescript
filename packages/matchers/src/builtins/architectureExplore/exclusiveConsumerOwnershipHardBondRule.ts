import { Array, HashMap, HashSet, Option, Tuple, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { entityKeyEquivalence } from "./entityKeyEquivalence.js"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleHardBondCandidate } from "./semanticModuleHardBondCandidate.js"
import { SemanticModuleHardBondRule } from "./semanticModuleHardBondRule.js"
import type { semanticSubjectWitnessSchema as SemanticSubjectWitness } from "./semanticSubjectWitnessSchema.js"
import { semanticEvidenceKey } from "./semanticEvidenceKey.js"
import { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"
import { semanticComponentOrder } from "./semanticComponentOrder.js"
import { portableKeyToken } from "./portableKeyToken.js"
import { exclusiveConsumerOwnershipEvidenceSchema } from "./exclusiveConsumerOwnershipEvidenceSchema.js"
import { componentToken } from "./componentToken.js"
import { componentLookup } from "./componentLookup.js"
import { componentMatchesToken } from "./componentMatchesToken.js"

const indexMemberIntoComponents =
  (member: SemanticModuleEntityKey, component: ReadonlyArray<SemanticModuleEntityKey>) =>
  (componentByEntity: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>>) => {
    const memberToken = portableKeyToken(member)
    return HashMap.set(componentByEntity, memberToken, component)
  }

const indexComponentMembers =
  (component: ReadonlyArray<SemanticModuleEntityKey>) =>
  (
    componentByEntity: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>>
  ): HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>> =>
    Array.reduce(component, componentByEntity, (current, member) =>
      indexMemberIntoComponents(member, component)(current)
    )

const emptyComponentIndex = HashMap.empty<string, ReadonlyArray<SemanticModuleEntityKey>>()

const buildComponentIndex = (
  components: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>
): HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>> =>
  Array.reduce(components, emptyComponentIndex, (current, component) =>
    indexComponentMembers(component)(current)
  )

const componentDiffersFromToken =
  (expectedToken: string) => (component: ReadonlyArray<SemanticModuleEntityKey>) => {
    const matches = componentMatchesToken(expectedToken)(component)
    return !matches
  }

const isIncomingPair =
  (targetToken: string) =>
  (
    targetComponentValue: ReadonlyArray<SemanticModuleEntityKey>,
    consumerComponentValue: ReadonlyArray<SemanticModuleEntityKey>
  ) => {
    const targetsTarget = componentMatchesToken(targetToken)(targetComponentValue)
    const fromOutside = componentDiffersFromToken(targetToken)(consumerComponentValue)
    return targetsTarget && fromOutside
  }

const referencePairMatchesIncoming =
  (targetToken: string) =>
  (
    targetComponentValue: ReadonlyArray<SemanticModuleEntityKey>,
    consumerComponentValue: ReadonlyArray<SemanticModuleEntityKey>
  ) =>
    isIncomingPair(targetToken)(targetComponentValue, consumerComponentValue)

const isIncomingToTarget =
  (
    componentByEntity: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>>,
    targetToken: string
  ) =>
  (reference: SemanticReferenceWitness) => {
    const lookup = componentLookup(componentByEntity)
    const targetComponent = lookup(reference.target)
    const consumerComponent = lookup(reference.consumer)
    const componentPair = Array.make(targetComponent, consumerComponent)
    const pair = Option.all(componentPair)
    const matchesIncoming = referencePairMatchesIncoming(targetToken)
    return Option.exists(pair, ([targetComponentValue, consumerComponentValue]) =>
      matchesIncoming(targetComponentValue, consumerComponentValue)
    )
  }

const sameComponentToken = (
  left: ReadonlyArray<SemanticModuleEntityKey>,
  right: ReadonlyArray<SemanticModuleEntityKey>
) => {
  const leftToken = componentToken(left)
  return componentMatchesToken(leftToken)(right)
}

const consumerComponentFromReference =
  (componentByEntity: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>>) =>
  (reference: SemanticReferenceWitness) => {
    const lookup = componentLookup(componentByEntity)
    const consumerComponent = lookup(reference.consumer)
    return Option.getOrThrow(consumerComponent)
  }

const sourceComponentsForIncoming =
  (componentByEntity: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>>) =>
  (incomingReferences: ReadonlyArray<SemanticReferenceWitness>) =>
    pipe(
      incomingReferences,
      Array.map(consumerComponentFromReference(componentByEntity)),
      Array.dedupeWith(sameComponentToken),
      Array.sort(semanticComponentOrder)
    )

const unownedConsumersForTarget =
  (targetComponent: ReadonlyArray<SemanticModuleEntityKey>) =>
  (unownedConsumers: SemanticModuleReferenceGraph["unownedConsumers"]) => {
    const memberTokens = Array.map(targetComponent, portableKeyToken)
    const tokens = HashSet.fromIterable(memberTokens)

    const targetsMember = (reference: (typeof unownedConsumers)[number]) => {
      const targetToken = portableKeyToken(reference.target)
      return HashSet.has(tokens, targetToken)
    }

    return Array.filter(unownedConsumers, targetsMember)
  }

const subjectEntry = (witness: SemanticSubjectWitness) => {
  const token = portableKeyToken(witness.operation)

  return Tuple.make(token, witness.subject)
}

const subjectTokens = (subjects: ReadonlyArray<SemanticModuleEntityKey>) =>
  pipe(subjects, Array.map(portableKeyToken), HashSet.fromIterable)

const subjectsOf =
  (referenceGraph: SemanticModuleReferenceGraph) =>
  (component: ReadonlyArray<SemanticModuleEntityKey>): ReadonlyArray<SemanticModuleEntityKey> => {
    const entries = Array.map(referenceGraph.subjects, subjectEntry)
    const subjectByOperation = HashMap.fromIterable(entries)

    const subjectOfMember = (member: SemanticModuleEntityKey) => {
      const memberToken = portableKeyToken(member)
      const subject = HashMap.get(subjectByOperation, memberToken)

      return Option.toArray(subject)
    }

    const subjects = Array.flatMap(component, subjectOfMember)

    return Array.dedupeWith(subjects, entityKeyEquivalence)
  }

const sharesSubjectWith =
  (targets: HashSet.HashSet<string>) => (subject: SemanticModuleEntityKey) => {
    const subjectToken = portableKeyToken(subject)

    return HashSet.has(targets, subjectToken)
  }

// Ownership stops at a proven subject because implementation privacy cannot erase a boundary.
const mergePreservesSubjectBoundaries =
  (targetSubjects: ReadonlyArray<SemanticModuleEntityKey>) =>
  (sourceSubjects: ReadonlyArray<SemanticModuleEntityKey>) => {
    const sourceTokens = subjectTokens(sourceSubjects)
    const targetTokens = subjectTokens(targetSubjects)
    const sharesTarget = sharesSubjectWith(targetTokens)
    const sharesSubject = Array.some(sourceSubjects, sharesTarget)
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
  (witness: SemanticReferenceWitness): SemanticModuleHardBondCandidate => {
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

export const ownershipCandidateForComponent =
  (referenceGraph: SemanticModuleReferenceGraph) =>
  (
    targetComponent: ReadonlyArray<SemanticModuleEntityKey>
  ): Option.Option<SemanticModuleHardBondCandidate> => {
    const componentByEntity = buildComponentIndex(referenceGraph.components)
    const targetToken = componentToken(targetComponent)
    const incomingFilter = isIncomingToTarget(componentByEntity, targetToken)
    const incomingReferences = Array.filter(referenceGraph.references, incomingFilter)
    const sourceComponents = sourceComponentsForIncoming(componentByEntity)(incomingReferences)

    const unownedConsumers = unownedConsumersForTarget(targetComponent)(
      referenceGraph.unownedConsumers
    )

    const hasSingleSource = strictEqual(1)(sourceComponents.length)
    const hasNoUnowned = strictEqual(0)(unownedConsumers.length)
    const exclusive = hasSingleSource && hasNoUnowned

    if (!exclusive) {
      return Option.none()
    }

    const sourceComponentHead = Array.head(sourceComponents)
    const witnessHead = Array.head(incomingReferences)
    const subjectsOfComponent = subjectsOf(referenceGraph)
    const targetSubjects = subjectsOfComponent(targetComponent)
    const consumerSubjects = Option.map(sourceComponentHead, subjectsOfComponent)
    const preservesBoundaries = mergePreservesSubjectBoundaries(targetSubjects)
    const boundaryPreserving = Option.exists(consumerSubjects, preservesBoundaries)

    if (!boundaryPreserving) {
      return Option.none()
    }

    const candidateFor = (
      sourceComponent: ReadonlyArray<SemanticModuleEntityKey>,
      witness: SemanticReferenceWitness
    ) => {
      const consumerSubjectList = subjectsOfComponent(sourceComponent)
      const withSource = makeExclusiveOwnershipCandidate(sourceComponent)
      const withTarget = withSource(targetComponent)
      const withConsumerSubjects = withTarget(consumerSubjectList)
      const withTargetSubjects = withConsumerSubjects(targetSubjects)
      const withSources = withTargetSubjects(sourceComponents)
      const withUnowned = withSources(unownedConsumers)

      return withUnowned(witness)
    }

    return Option.zipWith(sourceComponentHead, witnessHead, candidateFor)
  }

const candidatesFromComponent =
  (referenceGraph: SemanticModuleReferenceGraph) =>
  (component: ReadonlyArray<SemanticModuleEntityKey>) =>
    pipe(component, ownershipCandidateForComponent(referenceGraph), Option.toArray)

export const exclusiveConsumerOwnershipCandidates: SemanticModuleHardBondRule["candidates"] = (
  _context,
  _entities,
  referenceGraph
) => pipe(referenceGraph.components, Array.flatMap(candidatesFromComponent(referenceGraph)))

export const exclusiveConsumerOwnershipHardBondRule = SemanticModuleHardBondRule.make({
  id: "exclusive-consumer-ownership",
  evidenceSchema: exclusiveConsumerOwnershipEvidenceSchema,
  candidates: exclusiveConsumerOwnershipCandidates
})
