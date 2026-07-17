import { Array, Effect, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { packageExamples } from "../../defineCheck.js"
import { externalDependencyConstructionName, moduleScopeEffectsName } from "./names.js"

const minimumConstructions = 2
const constructionNames = Array.make(externalDependencyConstructionName, moduleScopeEffectsName)

const makeHardToTestHotspot = (examples: NonEmptyRefactorExamples) => {
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
          Array.filter(constructions, (element) => element.detection.location.path === filePath)
            .length >= minimumConstructions
      ),
      Array.map((filePath) => {
        const atPath = Array.filter(
          constructions,
          (element) => element.detection.location.path === filePath
        )

        const constructorCount = Array.filter(
          atPath,
          (element) => element.name === externalDependencyConstructionName
        ).length

        const moduleScopeCount = Array.filter(
          atPath,
          (element) => element.name === moduleScopeEffectsName
        ).length

        const location = adviceLocation(filePath)
        const constructionItem = evidenceItem("external-dependency-construction", constructorCount)
        const moduleScopeItem = evidenceItem("module-scope-effects", moduleScopeCount)
        const evidence = Array.make(constructionItem, moduleScopeItem)

        return new Advice({
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

  return deriveSignals(hardToTestAdvice)
}

export const hardToTestHotspot = pipe(
  packageExamples("hard-to-test-hotspot"),
  Effect.map(makeHardToTestHotspot)
)
