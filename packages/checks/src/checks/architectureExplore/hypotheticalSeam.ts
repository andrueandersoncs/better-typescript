import { Array, Function, Option, Result, pipe } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { contextTagSeamDataOf } from "./evidence.js"
import type { ContextTagSeamData } from "./data.js"
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
      const hasNoTestAdapter = strictEqual(data.testAdapterCount, 0)
      const conditions = Array.make(hasAtMostOneProductionAdapter, hasNoTestAdapter)

      return Array.every(conditions, Boolean)
    })
  )

const hypotheticalSeamAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const isSingleAdapterSeamsElement = (element: NamedDetection) =>
    strictEqual(element.name, singleAdapterSeamsName)

  const isContextTagSeamsElement = (element: NamedDetection) =>
    strictEqual(element.name, contextTagSeamsName)

  const hasPath = (filePath: string) => (element: NamedDetection) =>
    strictEqual(element.detection.location.path, filePath)

  const hasNoConsumers = (data: ContextTagSeamData) => strictEqual(data.consumerCount, 0)
  const singleAdapterSeams = Array.filter(elements, isSingleAdapterSeamsElement)

  const contextSeams = pipe(
    elements,
    Array.filter(isContextTagSeamsElement),
    Array.filter(isHypotheticalContext)
  )

  const seams = Array.appendAll(singleAdapterSeams, contextSeams)

  const paths = pipe(
    seams,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.map(paths, (filePath) => {
    const atPath = Array.filter(seams, hasPath(filePath))

    const deadCount = pipe(
      atPath,
      Array.filter(isContextTagSeamsElement),
      Array.filterMap(Function.flow(contextTagSeamDataOf, Result.fromOption(Function.constVoid))),
      Array.countBy(hasNoConsumers)
    )

    const location = makeAdviceLocation(filePath)
    const seamItem = makeEvidenceItem("single-adapter-seams", atPath.length)

    const evidence =
      deadCount > 0
        ? pipe(makeEvidenceItem("dead-seams", deadCount), Array.of, Array.prepend(seamItem))
        : Array.of(seamItem)

    const remediation = deadCount > 0 ? baseRemediation + deadRemediation : baseRemediation
    const examples = hypotheticalSeamExamples

    return Advice.make({
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
