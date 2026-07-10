import { Array, Effect, Option, Schema, Stream, pipe } from "effect"
import {
  Advice,
  adviceLocation,
  collectSignals,
  countDetectionsAtPath,
  detectionAtPath,
  evidenceItem
} from "../engine/derive.js"
import type { EvidenceItem } from "../engine/derive.js"
import { Detection } from "../engine/location.js"

const detectionArray = Schema.Array(Detection)

class ImperativeStateSignals extends Schema.Class<ImperativeStateSignals>(
  "ImperativeStateSignals"
)({
  noMutation: detectionArray,
  preferHashMap: detectionArray,
  preferHashSet: detectionArray,
  noMutableArrayMethods: detectionArray,
  noMutableVariableDeclarations: detectionArray
}) {}

const detectionSignal = Schema.Any

export class ImperativeStateManagerInput extends Schema.Class<ImperativeStateManagerInput>(
  "ImperativeStateManagerInput"
)({
  noMutation: detectionSignal,
  preferHashMap: detectionSignal,
  preferHashSet: detectionSignal,
  noMutableArrayMethods: detectionSignal,
  noMutableVariableDeclarations: detectionSignal
}) {
  declare readonly noMutation: Stream.Stream<Detection, Error>
  declare readonly preferHashMap: Stream.Stream<Detection, Error>
  declare readonly preferHashSet: Stream.Stream<Detection, Error>
  declare readonly noMutableArrayMethods: Stream.Stream<Detection, Error>
  declare readonly noMutableVariableDeclarations: Stream.Stream<
    Detection,
    Error
  >
}

interface MutationElementData {
  readonly target: string
}

const isSharedStateMutation = (element: Detection): boolean => {
  const data = Option.fromNullable(element.data)

  return Option.exists(
    data,
    (value) => (value as MutationElementData).target === "shared-state"
  )
}

const sharedMutationCountAt =
  (path: string) =>
  (elements: ReadonlyArray<Detection>): number => {
    const atPath = Array.filter(elements, detectionAtPath(path))
    const sharedStateMutations = Array.filter(atPath, isSharedStateMutation)

    return sharedStateMutations.length
  }

const imperativeEvidence =
  (signals: ImperativeStateSignals) =>
  (path: string): ReadonlyArray<EvidenceItem> => {
    const sharedCount = sharedMutationCountAt(path)(signals.noMutation)
    const mutationCount = countDetectionsAtPath(path)(signals.noMutation)
    const hashMapCount = countDetectionsAtPath(path)(signals.preferHashMap)
    const hashSetCount = countDetectionsAtPath(path)(signals.preferHashSet)
    const arrayCount = countDetectionsAtPath(path)(
      signals.noMutableArrayMethods
    )
    const declarationCount = countDetectionsAtPath(path)(
      signals.noMutableVariableDeclarations
    )
    const sharedItem = evidenceItem("no-mutation/shared-state", sharedCount)
    const observations = [
      evidenceItem("no-mutation", mutationCount),
      evidenceItem("prefer-hash-map", hashMapCount),
      evidenceItem("prefer-hash-set", hashSetCount),
      evidenceItem("no-mutable-array-methods", arrayCount),
      evidenceItem("no-mutable-variable-declarations", declarationCount)
    ]
    const nonZero = Array.filter(observations, (item) => item.count > 0)

    return Array.prepend(nonZero, sharedItem)
  }

const imperativeStateAdvice =
  (signals: ImperativeStateSignals) =>
  (path: string): Advice => {
    const location = adviceLocation(path)
    const evidence = imperativeEvidence(signals)(path)

    return new Advice({
      location,
      level: "file",
      title: "imperative state manager",
      remediation:
        "This file manages long-lived state outside the runtime; element-level rewrites patch " +
        "symptoms. Hold each cell in a Ref (SynchronizedRef when updates contend), fan out to " +
        "subscribers with PubSub, assemble the manager as a Layer, and enter the Effect " +
        "runtime once at the boundary.",
      evidence
    })
  }

const imperativeStateAdviceFor = (
  signals: ImperativeStateSignals
): ReadonlyArray<Advice> => {
  const mutationPaths = Array.map(
    signals.noMutation,
    (element) => element.location.path
  )
  const paths = Array.dedupe(mutationPaths)

  return pipe(
    paths,
    Array.filter(
      (path) => sharedMutationCountAt(path)(signals.noMutation) >= 8
    ),
    Array.map(imperativeStateAdvice(signals))
  )
}

export const imperativeStateManager = (
  input: ImperativeStateManagerInput
): Stream.Stream<Advice, Error> => {
  const noMutation = collectSignals(input.noMutation)
  const preferHashMap = collectSignals(input.preferHashMap)
  const preferHashSet = collectSignals(input.preferHashSet)
  const noMutableArrayMethods = collectSignals(input.noMutableArrayMethods)
  const noMutableVariableDeclarations = collectSignals(
    input.noMutableVariableDeclarations
  )

  return pipe(
    Effect.all({
      noMutation,
      preferHashMap,
      preferHashSet,
      noMutableArrayMethods,
      noMutableVariableDeclarations
    }),
    Effect.map(imperativeStateAdviceFor),
    Effect.map(Stream.fromIterable),
    Stream.unwrap
  )
}
