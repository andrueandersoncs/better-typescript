import { Array, Function, Option, Schema, pipe, Struct, flow } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { countDetectionsAtPath } from "@better-typescript/core/engine/location/countDetectionsAtPath"
import { strictEqual } from "@better-typescript/core/engine/equivalence/strictEqual"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makePackageExamples } from "../makePackageExamples.js"
import { ImperativeStateSignals } from "./data.js"

// Shared mutation-target evidence because detectors and advice decode one record.
export const MutationElementData = Schema.Struct({
  target: Schema.String
})

export interface MutationElementData extends Schema.Schema.Type<typeof MutationElementData> {}

export const imperativeStateManagerExamples = makePackageExamples("imperative-state-manager")

const isSharedStateMutation = (element: Detection) => {
  const data = Option.fromNullishOr(element.data)

  const isSharedStateTarget = flow(
    Struct.get<MutationElementData, "target">("target"),
    strictEqual("shared-state")
  )

  const sharedState = pipe(
    data,
    Option.filter(Schema.is(MutationElementData)),
    Option.map(isSharedStateTarget),
    Option.getOrElse(Function.constant(false))
  )

  return sharedState
}

const sharedMutationCountAt = (path: string) => (elements: ReadonlyArray<Detection>) => {
  const matchesPath = (element: Detection) => strictEqual(path)(element.location.path)
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
    const location = Location.make({ path: path })
    const sharedCount = sharedMutationCountAt(path)(signals.noMutation)
    const mutationCount = countDetectionsAtPath(path)(signals.noMutation)
    const hashMapCount = countDetectionsAtPath(path)(signals.preferHashMap)
    const hashSetCount = countDetectionsAtPath(path)(signals.preferHashSet)
    const arrayCount = countDetectionsAtPath(path)(signals.noMutableArrayMethods)
    const declarationCount = countDetectionsAtPath(path)(signals.noMutableVariableDeclarations)

    const sharedItem = EvidenceItem.make({
      measure: "no-mutation/shared-state",
      count: sharedCount
    })

    const mutationEvidence = EvidenceItem.make({ measure: "no-mutation", count: mutationCount })
    const hashMapEvidence = EvidenceItem.make({ measure: "prefer-hash-map", count: hashMapCount })
    const hashSetEvidence = EvidenceItem.make({ measure: "prefer-hash-set", count: hashSetCount })

    const mutableArrayEvidence = EvidenceItem.make({
      measure: "no-mutable-array-methods",
      count: arrayCount
    })

    const mutableDeclarationEvidence = EvidenceItem.make({
      measure: "no-mutable-variable-declarations",
      count: declarationCount
    })

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
      examples: imperativeStateManagerExamples
    })
  }

  return pipe(paths, Array.filter(hasEnoughSharedMutations), Array.map(adviceForPath))
}

export const imperativeStateManager = Function.compose(
  ImperativeStateSignals.make,
  imperativeStateAdviceFor
)
