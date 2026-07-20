import { Array, Function, Option, Schema, pipe } from "effect"
import { Advice, type EvidenceItem } from "@better-typescript/core/engine/derive/data"
import { makeAdviceLocation, makeEvidenceItem } from "@better-typescript/core/engine/derive"
import { countDetectionsAtPath } from "@better-typescript/core/engine/location"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Detection } from "@better-typescript/core/engine/location/data"
import { packageExamples } from "../../defineCheck.js"
import { ImperativeStateSignals, MutationElementData } from "./data.js"

export const imperativeStateManagerExamples = packageExamples("imperative-state-manager")

const isSharedStateMutation = (element: Detection) => {
  const data = Option.fromNullishOr(element.data)

  const isSharedStateTarget = (value: MutationElementData) =>
    strictEqual(value.target, "shared-state")

  const sharedState = pipe(
    data,
    Option.filter(Schema.is(MutationElementData)),
    Option.map(isSharedStateTarget),
    Option.getOrElse(Function.constant(false))
  )

  return sharedState
}

const sharedMutationCountAt = (path: string) => (elements: ReadonlyArray<Detection>) => {
  const matchesPath = (element: Detection) => strictEqual(element.location.path, path)
  const atPath = Array.filter(elements, matchesPath)
  const sharedStateMutations = Array.filter(atPath, isSharedStateMutation)

  return sharedStateMutations.length
}

const imperativeStateAdviceFor = (signals: ImperativeStateSignals): ReadonlyArray<Advice> => {
  const mutationPaths = Array.map(signals.noMutation, (element) => element.location.path)
  const paths = Array.dedupe(mutationPaths)

  const hasEnoughSharedMutations = (path: string) =>
    sharedMutationCountAt(path)(signals.noMutation) >= 8

  const adviceForPath = (path: string) => {
    const location = makeAdviceLocation(path)
    const sharedCount = sharedMutationCountAt(path)(signals.noMutation)
    const mutationCount = countDetectionsAtPath(path)(signals.noMutation)
    const hashMapCount = countDetectionsAtPath(path)(signals.preferHashMap)
    const hashSetCount = countDetectionsAtPath(path)(signals.preferHashSet)
    const arrayCount = countDetectionsAtPath(path)(signals.noMutableArrayMethods)
    const declarationCount = countDetectionsAtPath(path)(signals.noMutableVariableDeclarations)
    const sharedItem = makeEvidenceItem("no-mutation/shared-state", sharedCount)
    const mutationEvidence = makeEvidenceItem("no-mutation", mutationCount)
    const hashMapEvidence = makeEvidenceItem("prefer-hash-map", hashMapCount)
    const hashSetEvidence = makeEvidenceItem("prefer-hash-set", hashSetCount)
    const mutableArrayEvidence = makeEvidenceItem("no-mutable-array-methods", arrayCount)

    const mutableDeclarationEvidence = makeEvidenceItem(
      "no-mutable-variable-declarations",
      declarationCount
    )

    const observations = Array.make(
      mutationEvidence,
      hashMapEvidence,
      hashSetEvidence,
      mutableArrayEvidence,
      mutableDeclarationEvidence
    )

    const hasPositiveCount = (item: EvidenceItem) => item.count > 0
    const nonZero = Array.filter(observations, hasPositiveCount)
    const evidence = Array.prepend(nonZero, sharedItem)
    const examples = imperativeStateManagerExamples

    return Advice.make({
      location,
      level: "file",
      title: "imperative state manager",
      remediation:
        "This file manages long-lived state outside the runtime; element-level rewrites patch " +
        "symptoms. Hold each cell in a Ref (SynchronizedRef when updates contend), fan out to " +
        "subscribers with PubSub, assemble the manager as a Layer, and enter the Effect " +
        "runtime once at the boundary.",
      evidence,
      examples
    })
  }

  return pipe(paths, Array.filter(hasEnoughSharedMutations), Array.map(adviceForPath))
}

export const imperativeStateManager = Function.compose(
  ImperativeStateSignals.make,
  imperativeStateAdviceFor
)
