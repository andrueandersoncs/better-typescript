import { Array, Effect, Function, Option, Schema, Stream, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, collectSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import { countDetectionsAtPath, detectionAtPath } from "@better-typescript/core/engine/location"
import { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { ImperativeStateManagerInput, ImperativeStateSignals, MutationElementData } from "./data.js"

export const imperativeStateManagerExamples: NonEmptyRefactorExamples = fixtureRefactorExamples(
  "imperative-state-manager"
)

const isSharedStateMutation = (element: Detection): boolean => {
  const data = Option.fromNullishOr(element.data)

  const sharedState = pipe(
    data,
    Option.filter(Schema.is(MutationElementData)),
    Option.map((value) => value.target === "shared-state"),
    Option.getOrElse(Function.constant(false))
  )

  return sharedState
}

const sharedMutationCountAt =
  (path: string) =>
  (elements: ReadonlyArray<Detection>): number => {
    const atPath = Array.filter(elements, detectionAtPath(path))
    const sharedStateMutations = Array.filter(atPath, isSharedStateMutation)

    return sharedStateMutations.length
  }

const imperativeStateAdviceFor = (signals: ImperativeStateSignals): ReadonlyArray<Advice> => {
  const mutationPaths = Array.map(signals.noMutation, (element) => element.location.path)
  const paths = Array.dedupe(mutationPaths)

  return pipe(
    paths,
    Array.filter((path) => sharedMutationCountAt(path)(signals.noMutation) >= 8),
    Array.map((path) => {
      const location = adviceLocation(path)
      const sharedCount = sharedMutationCountAt(path)(signals.noMutation)
      const mutationCount = countDetectionsAtPath(path)(signals.noMutation)
      const hashMapCount = countDetectionsAtPath(path)(signals.preferHashMap)
      const hashSetCount = countDetectionsAtPath(path)(signals.preferHashSet)
      const arrayCount = countDetectionsAtPath(path)(signals.noMutableArrayMethods)
      const declarationCount = countDetectionsAtPath(path)(signals.noMutableVariableDeclarations)
      const sharedItem = evidenceItem("no-mutation/shared-state", sharedCount)
      const mutationEvidence = evidenceItem("no-mutation", mutationCount)
      const hashMapEvidence = evidenceItem("prefer-hash-map", hashMapCount)
      const hashSetEvidence = evidenceItem("prefer-hash-set", hashSetCount)
      const mutableArrayEvidence = evidenceItem("no-mutable-array-methods", arrayCount)

      const mutableDeclarationEvidence = evidenceItem(
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

      const nonZero = Array.filter(observations, (item) => item.count > 0)
      const evidence = Array.prepend(nonZero, sharedItem)

      return new Advice({
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
    })
  )
}

export const imperativeStateManager = (
  input: ImperativeStateManagerInput
): Stream.Stream<Advice, Error> => {
  const noMutation = collectSignals(input.noMutation)
  const preferHashMap = collectSignals(input.preferHashMap)
  const preferHashSet = collectSignals(input.preferHashSet)
  const noMutableArrayMethods = collectSignals(input.noMutableArrayMethods)
  const noMutableVariableDeclarations = collectSignals(input.noMutableVariableDeclarations)

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
