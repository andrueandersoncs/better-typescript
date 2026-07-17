import { Array, Function, Option, Result, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { contextTagSeamDataOf } from "./evidence.js"
import { contextTagSeamsName, singleAdapterSeamsName } from "./names.js"

export const hypotheticalSeamExamples = packageExamples("hypothetical-seam")

const baseRemediation =
  "These injected behavioural interfaces have one production adapter and no test adapter. " +
  "Remove the speculative port and keep the seam internal until a second implementation actually varies across it."

const deadRemediation =
  " A seam with no consumers is dead surface; delete the service until a caller and a second adapter exist."

const isHypotheticalContext = (element: NamedDetection) =>
  pipe(
    contextTagSeamDataOf(element),
    Option.exists((data) => {
      const hasAtMostOneProductionAdapter = data.productionAdapterCount <= 1
      const hasNoTestAdapter = data.testAdapterCount === 0
      const conditions = Array.make(hasAtMostOneProductionAdapter, hasNoTestAdapter)

      return Array.every(conditions, Boolean)
    })
  )

const hypotheticalSeamAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const singleAdapterSeams = Array.filter(
    elements,
    (element) => element.name === singleAdapterSeamsName
  )

  const contextSeams = pipe(
    elements,
    Array.filter((element) => element.name === contextTagSeamsName),
    Array.filter(isHypotheticalContext)
  )

  const seams = Array.appendAll(singleAdapterSeams, contextSeams)

  const paths = pipe(
    seams,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.map(paths, (filePath) => {
    const atPath = Array.filter(seams, (element) => element.detection.location.path === filePath)

    const deadCount = pipe(
      atPath,
      Array.filter((element) => element.name === contextTagSeamsName),
      Array.filterMap(Function.flow(contextTagSeamDataOf, Result.fromOption(Function.constVoid))),
      Array.countBy((data) => data.consumerCount === 0)
    )

    const location = adviceLocation(filePath)
    const seamItem = evidenceItem("single-adapter-seams", atPath.length)

    const evidence =
      deadCount > 0
        ? pipe(evidenceItem("dead-seams", deadCount), Array.of, Array.prepend(seamItem))
        : Array.of(seamItem)

    const remediation = deadCount > 0 ? baseRemediation + deadRemediation : baseRemediation
    const examples = hypotheticalSeamExamples

    return new Advice({
      location,
      level: "file",
      title: "hypothetical seam",
      remediation,
      evidence,
      examples
    })
  })
}

export const hypotheticalSeam = deriveSignals(hypotheticalSeamAdvice)
