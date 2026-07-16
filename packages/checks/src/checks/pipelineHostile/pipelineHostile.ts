import { Array, pipe } from "effect"
import type { Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, evidenceItem } from "@better-typescript/core/engine/derive"
import { countDetectionsAtPath } from "@better-typescript/core/engine/location"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { adviceFromSignalPair } from "../support/advice.js"
import { packageExamples } from "../../defineCheck.js"
import { PipelineHostileInput, PipelineSignals } from "./data.js"

export const pipelineHostileExamples = packageExamples("pipeline-hostile")

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
      const examples = pipelineHostileExamples()

      return new Advice({
        location,
        level: "file",
        title: "pipeline-hostile module",
        remediation:
          "This file composes inside-out because its functions are not data-last: call sites " +
          "cannot pipe, so results nest. Fix the signatures first — curry configuration ahead " +
          "of the data argument — and the nested-call signals dissolve at the call sites.",
        evidence,
        examples
      })
    })
  )
}

const pipelineSignals = (
  noNestedCalls: ReadonlyArray<Detection>,
  preferCurriedDataLastFunctions: ReadonlyArray<Detection>
): PipelineSignals => new PipelineSignals({ noNestedCalls, preferCurriedDataLastFunctions })

export const pipelineHostile = (input: PipelineHostileInput): Stream.Stream<Advice> => {
  const advice = adviceFromSignalPair(
    input.noNestedCalls,
    input.preferCurriedDataLastFunctions,
    pipelineSignals,
    pipelineHostileAdviceFor
  )

  return advice
}
