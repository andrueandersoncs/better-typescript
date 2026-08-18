import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { countDetectionsAtPath } from "@better-typescript/core/engine/location/countDetectionsAtPath"
import type { Detection } from "@better-typescript/core/engine/location/detectionData"
import { makePackageExamples } from "../makePackageExamples.js"

export const pipelineHostileExamples = makePackageExamples("pipeline-hostile")

export const pipelineHostile = (
  noNestedCalls: ReadonlyArray<Detection>,
  preferCurriedDataLastFunctions: ReadonlyArray<Detection>
): ReadonlyArray<Advice> => {
  const isPipelineHostile = (path: string) => {
    const hasNestedCalls = countDetectionsAtPath(path)(noNestedCalls) >= 5
    const hasUncurriedFunctions = countDetectionsAtPath(path)(preferCurriedDataLastFunctions) >= 5
    const noNestedCallsEvidence = Array.make(hasNestedCalls, hasUncurriedFunctions)

    return Array.every(noNestedCallsEvidence, Boolean)
  }

  const nestedCallPaths = Array.map(noNestedCalls, (element) => element.location.path)
  const uniquePaths = Array.dedupe(nestedCallPaths)

  return pipe(
    uniquePaths,
    Array.filter(isPipelineHostile),
    Array.map((path) => {
      const location = Location.make({ path: path })
      const nestedCount = countDetectionsAtPath(path)(noNestedCalls)
      const uncurriedCount = countDetectionsAtPath(path)(preferCurriedDataLastFunctions)
      const nestedItem = EvidenceItem.make({ measure: "no-nested-calls", count: nestedCount })

      const uncurriedItem = EvidenceItem.make({
        measure: "prefer-curried-data-last-functions",
        count: uncurriedCount
      })

      const evidence = Array.make(nestedItem, uncurriedItem)

      return Advice.make({
        location,
        level: "file",
        title: "pipeline-hostile module",
        remediation:
          "This file composes inside-out because its functions are not data-last: call sites " +
          "cannot pipe, so results nest. Fix the signatures first — curry configuration ahead " +
          "of the data argument — and the nested-call signals dissolve at the call sites.",
        evidence,
        examples: pipelineHostileExamples
      })
    })
  )
}
