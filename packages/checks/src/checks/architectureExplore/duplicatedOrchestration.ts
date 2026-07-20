import { Array, Function, Option, Record, Result, Struct, pipe } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { commonDirectory, compositionFingerprintDataOf } from "./evidence.js"
import { compositionFingerprintsName } from "./names.js"

export const duplicatedOrchestrationExamples = packageExamples("duplicated-orchestration")

const minimumDuplicateSites = 2

const duplicatedOrchestrationAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const isCompositionFingerprintElement = (element: NamedDetection) =>
    strictEqual(element.name, compositionFingerprintsName)

  const fingerprintElements = pipe(
    elements,
    Array.filter(isCompositionFingerprintElement),
    Array.filter(Function.flow(compositionFingerprintDataOf, Option.isSome))
  )

  const grouped = Array.groupBy(
    fingerprintElements,
    Function.flow(compositionFingerprintDataOf, Option.getOrThrow, Struct.get("fingerprint"))
  )

  return pipe(
    Record.toEntries(grouped),
    Array.filterMap(([_fingerprint, matchingElements]) => {
      const paths = pipe(
        matchingElements,
        Array.map(
          Function.flow(Struct.get("detection"), Struct.get("location"), Struct.get("path"))
        ),
        Array.dedupe
      )

      if (paths.length < minimumDuplicateSites) {
        return Result.failVoid
      }

      const stepCount = pipe(
        Array.head(matchingElements),
        Option.flatMap(compositionFingerprintDataOf),
        Option.map(Struct.get("stepCount")),
        Option.getOrElse(Function.constant(0))
      )

      const directory = commonDirectory(paths)
      const location = makeAdviceLocation(directory)
      const sitesItem = makeEvidenceItem("duplicate-sites", paths.length)
      const stepsItem = makeEvidenceItem("orchestration-steps", stepCount)
      const evidence = Array.make(sitesItem, stepsItem)
      const examples = duplicatedOrchestrationExamples

      const advice = Advice.make({
        location,
        level: "directory",
        title: "duplicated orchestration",
        remediation:
          "The same call shape is re-plumbed at several sites; name the operation once and let callers " +
          "compose it, because the duplicated derive/concat shape invites drift.",
        evidence,
        examples
      })

      return Result.succeed(advice)
    })
  )
}

export const duplicatedOrchestration = deriveSignals(duplicatedOrchestrationAdvice)
