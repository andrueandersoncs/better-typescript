import { Array, Effect, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { externalDependencyConstructionName, moduleScopeEffectsName } from "./names.js"

export const hardToTestHotspotExamples = packageExamples("hard-to-test-hotspot")

const minimumConstructions = 2
const constructionNames = Array.make(externalDependencyConstructionName, moduleScopeEffectsName)

const hardToTestAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const constructions = Array.filter(elements, (element) =>
    Array.contains(constructionNames, element.name)
  )

  const paths = pipe(
    constructions,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return pipe(
    paths,
    Array.filter(
      (filePath) =>
        Array.countBy(constructions, (element) => element.detection.location.path === filePath) >=
        minimumConstructions
    ),
    Array.map((filePath) => {
      const atPath = Array.filter(
        constructions,
        (element) => element.detection.location.path === filePath
      )

      const constructorCount = Array.countBy(
        atPath,
        (element) => element.name === externalDependencyConstructionName
      )

      const moduleScopeCount = Array.countBy(
        atPath,
        (element) => element.name === moduleScopeEffectsName
      )

      const location = makeAdviceLocation(filePath)

      const constructionItem = makeEvidenceItem(
        "external-dependency-construction",
        constructorCount
      )

      const moduleScopeItem = makeEvidenceItem("module-scope-effects", moduleScopeCount)
      const evidence = Array.make(constructionItem, moduleScopeItem)
      const examples = hardToTestHotspotExamples

      return Advice.make({
        location,
        level: "file",
        title: "hard-to-test hotspot",
        remediation:
          "External collaborator construction is concentrated inside behaviour. Classify the dependency first, construct production adapters " +
          "at the composition root, and inject a port only when a real test adapter supplies the second implementation.",
        evidence,
        examples
      })
    })
  )
}

export const hardToTestHotspot = Effect.fn("HardToTestHotspot.derive")(
  deriveSignals(hardToTestAdvice)
)
