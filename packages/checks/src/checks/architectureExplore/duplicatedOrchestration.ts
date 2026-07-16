import { Array, Function, Option, Record, Result, Struct, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { commonDirectory, compositionFingerprintDataOf } from "./evidence.js"
import { compositionFingerprintsName } from "./names.js"

export const duplicatedOrchestrationExamples: NonEmptyRefactorExamples = fixtureRefactorExamples(
  "duplicated-orchestration"
)

const minimumDuplicateSites = 2

const duplicatedOrchestrationAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const fingerprintElements = pipe(
    elements,
    Array.filter((element) => element.name === compositionFingerprintsName),
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
      const location = adviceLocation(directory)
      const sitesItem = evidenceItem("duplicate-sites", paths.length)
      const stepsItem = evidenceItem("orchestration-steps", stepCount)
      const evidence = Array.make(sitesItem, stepsItem)

      const advice = new Advice({
        location,
        level: "directory",
        title: "duplicated orchestration",
        remediation:
          "The same call shape is re-plumbed at several sites; name the operation once and let callers " +
          "compose it, because the duplicated derive/concat shape invites drift.",
        evidence,
        examples: duplicatedOrchestrationExamples
      })

      return Result.succeed(advice)
    })
  )
}

export const duplicatedOrchestration = deriveSignals(duplicatedOrchestrationAdvice)
