import { Array, Effect, Schema, Stream, pipe } from "effect"
import {
  Advice,
  adviceLocation,
  collectSignals,
  countDetectionsAtPath,
  evidenceItem
} from "../engine/derive.js"
import type { EvidenceItem } from "../engine/derive.js"
import { Detection } from "../engine/location.js"

const detectionArray = Schema.Array(Detection)

class PipelineSignals extends Schema.Class<PipelineSignals>("PipelineSignals")({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
}) {}

const detectionSignal = Schema.Any

export class PipelineHostileInput extends Schema.Class<PipelineHostileInput>(
  "PipelineHostileInput"
)({
  noNestedCalls: detectionSignal,
  preferCurriedDataLastFunctions: detectionSignal
}) {
  declare readonly noNestedCalls: Stream.Stream<Detection, Error>
  declare readonly preferCurriedDataLastFunctions: Stream.Stream<
    Detection,
    Error
  >
}

const pipelineEvidence =
  (signals: PipelineSignals) =>
  (path: string): ReadonlyArray<EvidenceItem> => {
    const nestedCount = countDetectionsAtPath(path)(signals.noNestedCalls)
    const uncurriedCount = countDetectionsAtPath(path)(
      signals.preferCurriedDataLastFunctions
    )
    const nestedItem = evidenceItem("no-nested-calls", nestedCount)
    const uncurriedItem = evidenceItem(
      "prefer-curried-data-last-functions",
      uncurriedCount
    )

    return [nestedItem, uncurriedItem]
  }

const pipelineAdvice =
  (signals: PipelineSignals) =>
  (path: string): Advice => {
    const location = adviceLocation(path)
    const evidence = pipelineEvidence(signals)(path)

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
  }

const pipelineHostileAdviceFor = (
  signals: PipelineSignals
): ReadonlyArray<Advice> => {
  const isPipelineHostile = (path: string): boolean => {
    const hasNestedCalls =
      countDetectionsAtPath(path)(signals.noNestedCalls) >= 5
    const hasUncurriedFunctions =
      countDetectionsAtPath(path)(signals.preferCurriedDataLastFunctions) >= 5

    return [hasNestedCalls, hasUncurriedFunctions].every(Boolean)
  }
  const nestedCallPaths = Array.map(
    signals.noNestedCalls,
    (element) => element.location.path
  )
  const uniquePaths = Array.dedupe(nestedCallPaths)

  return pipe(
    uniquePaths,
    Array.filter(isPipelineHostile),
    Array.map(pipelineAdvice(signals))
  )
}

export const pipelineHostile = (
  input: PipelineHostileInput
): Stream.Stream<Advice, Error> => {
  const noNestedCalls = collectSignals(input.noNestedCalls)
  const preferCurriedDataLastFunctions = collectSignals(
    input.preferCurriedDataLastFunctions
  )

  return pipe(
    Effect.all({ noNestedCalls, preferCurriedDataLastFunctions }),
    Effect.map(pipelineHostileAdviceFor),
    Effect.map(Stream.fromIterable),
    Stream.unwrap
  )
}
