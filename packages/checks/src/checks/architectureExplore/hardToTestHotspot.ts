import { Array, pipe, Struct, flow } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
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
  const isConstructionName = (name: string) => Array.contains(constructionNames, name)
  const isConstructionElement = (element: NamedDetection) => isConstructionName(element.name)
  const detectionPath = (element: NamedDetection) => element.detection.location.path
  const constructions = Array.filter(elements, isConstructionElement)
  const paths = pipe(constructions, Array.map(detectionPath), Array.dedupe)

  const hasPath = (filePath: string) => (element: NamedDetection) =>
    strictEqual(filePath)(element.detection.location.path)

  const hasMinimumConstructions = (filePath: string) =>
    Array.countBy(constructions, hasPath(filePath)) >= minimumConstructions

  return pipe(
    paths,
    Array.filter(hasMinimumConstructions),
    Array.map((filePath) => {
      const atPath = Array.filter(constructions, hasPath(filePath))

      const isExternalDependencyConstruction = flow(
        Struct.get<NamedDetection, "name">("name"),
        strictEqual(externalDependencyConstructionName)
      )

      const isModuleScopeEffects = flow(
        Struct.get<NamedDetection, "name">("name"),
        strictEqual(moduleScopeEffectsName)
      )

      const constructorCount = Array.countBy(atPath, isExternalDependencyConstruction)
      const moduleScopeCount = Array.countBy(atPath, isModuleScopeEffects)
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

export const hardToTestHotspot = deriveSignals(hardToTestAdvice)
