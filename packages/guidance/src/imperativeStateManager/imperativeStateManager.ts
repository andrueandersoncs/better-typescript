import { Array, Function, Option, Predicate, Record, pipe, flow } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { countDetectionsAtPath } from "@better-typescript/core/engine/location/countDetectionsAtPath"
import { strictEqual } from "@better-typescript/core/engine/equivalence/strictEqual"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makePackageExamples } from "../makePackageExamples.js"

export const imperativeStateManagerExamples = makePackageExamples("imperative-state-manager")

export const imperativeStateManager = (
  noMutation: ReadonlyArray<Detection>,
  preferHashMap: ReadonlyArray<Detection>,
  preferHashSet: ReadonlyArray<Detection>,
  noMutableArrayMethods: ReadonlyArray<Detection>,
  noMutableVariableDeclarations: ReadonlyArray<Detection>
): ReadonlyArray<Advice> => {
  const isSharedStateMutation = (element: Detection) => {
    const data = Option.fromNullishOr(element.data)

    const isSharedStateTarget = flow(
      Record.get("target"),
      Option.map(strictEqual("shared-state")),
      Option.getOrElse(Function.constant(false))
    )

    return pipe(
      data,
      Option.filter(Predicate.isObject),
      Option.map(isSharedStateTarget),
      Option.getOrElse(Function.constant(false))
    )
  }

  const sharedMutationCountAt = (path: string) => (elements: ReadonlyArray<Detection>) => {
    const matchesPath = (element: Detection) => strictEqual(path)(element.location.path)
    const atPath = Array.filter(elements, matchesPath)
    const sharedStateMutations = Array.filter(atPath, isSharedStateMutation)

    return sharedStateMutations.length
  }

  const mutationPaths = Array.map(noMutation, (element) => element.location.path)
  const paths = Array.dedupe(mutationPaths)
  const hasEnoughSharedMutations = (path: string) => sharedMutationCountAt(path)(noMutation) >= 8

  const adviceForPath = (path: string) => {
    const location = Location.make({ path: path })
    const sharedCount = sharedMutationCountAt(path)(noMutation)
    const mutationCount = countDetectionsAtPath(path)(noMutation)
    const hashMapCount = countDetectionsAtPath(path)(preferHashMap)
    const hashSetCount = countDetectionsAtPath(path)(preferHashSet)
    const arrayCount = countDetectionsAtPath(path)(noMutableArrayMethods)
    const declarationCount = countDetectionsAtPath(path)(noMutableVariableDeclarations)

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
