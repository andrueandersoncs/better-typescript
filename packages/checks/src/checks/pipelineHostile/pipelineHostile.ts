import { Array, Effect, Stream, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, collectSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import { countDetectionsAtPath } from "@better-typescript/core/engine/location"
import { PipelineHostileInput, PipelineSignals } from "./data.js"

const pipelineHostileAdviceFor = (signals: PipelineSignals): ReadonlyArray<Advice> => {
  const isPipelineHostile = (path: string): boolean => {
    const hasNestedCalls = countDetectionsAtPath(path)(signals.noNestedCalls) >= 5

    const hasUncurriedFunctions =
      countDetectionsAtPath(path)(signals.preferCurriedDataLastFunctions) >= 5

    const noNestedCallsEvidence = Array.make(hasNestedCalls, hasUncurriedFunctions)

    return Array.every(noNestedCallsEvidence, Boolean)
  }

  const nestedCallPaths = Array.map(signals.noNestedCalls, (element) => element.location.path)

  const uniquePaths = Array.dedupe(nestedCallPaths)

  return pipe(
    uniquePaths,
    Array.filter(isPipelineHostile),
    Array.map((path) => {
      const location = adviceLocation(path)
      const nestedCount = countDetectionsAtPath(path)(signals.noNestedCalls)

      const uncurriedCount = countDetectionsAtPath(path)(signals.preferCurriedDataLastFunctions)

      const nestedItem = evidenceItem("no-nested-calls", nestedCount)

      const uncurriedItem = evidenceItem("prefer-curried-data-last-functions", uncurriedCount)

      const evidence = Array.make(nestedItem, uncurriedItem)

      return new Advice({
        location,
        level: "file",
        title: "pipeline-hostile module",
        remediation:
          "This file composes inside-out because its functions are not data-last: call sites " +
          "cannot pipe, so results nest. Fix the signatures first — curry configuration ahead " +
          "of the data argument — and the nested-call signals dissolve at the call sites.",
        evidence
      })
    })
  )
}

export const pipelineHostile = (input: PipelineHostileInput): Stream.Stream<Advice, Error> => {
  const noNestedCalls = collectSignals(input.noNestedCalls)

  const preferCurriedDataLastFunctions = collectSignals(input.preferCurriedDataLastFunctions)

  return pipe(
    Effect.all({ noNestedCalls, preferCurriedDataLastFunctions }),
    Effect.map(pipelineHostileAdviceFor),
    Effect.map(Stream.fromIterable),
    Stream.unwrap
  )
}
