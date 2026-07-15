import { Array, Function, Result, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { seamLeakageDataOf } from "./evidence.js"

export const leakedSeamExamples: NonEmptyRefactorExamples = fixtureRefactorExamples("leaked-seam")

const minimumLeaks = 2

const leakedSeamAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const leaks = Array.filter(elements, (element) => element.name === "seam-leakage-evidence")

  const paths = pipe(
    leaks,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.filterMap(paths, (filePath) => {
    const atPath = Array.filter(leaks, (element) => element.detection.location.path === filePath)

    if (atPath.length < minimumLeaks) {
      return Result.failVoid
    }

    const internalCount = pipe(
      atPath,
      Array.filterMap(Function.flow(seamLeakageDataOf, Result.fromOption(Function.constVoid))),
      Array.filter((data) => data.kind === "internal-path")
    ).length

    const sourceCount = atPath.length - internalCount
    const location = adviceLocation(filePath)
    const internalItem = evidenceItem("internal-path-imports", internalCount)
    const sourceItem = evidenceItem("source-path-imports", sourceCount)
    const evidence = Array.make(internalItem, sourceItem)

    const advice = new Advice({
      location,
      level: "file",
      title: "leaked seam",
      remediation:
        "This Module repeatedly bypasses declared interfaces through internal or package-source imports. " +
        "Route dependencies through one public seam so implementation paths remain local and replaceable.",
      evidence,
      examples: leakedSeamExamples
    })

    return Result.succeed(advice)
  })
}

export const leakedSeam = deriveSignals(leakedSeamAdvice)
