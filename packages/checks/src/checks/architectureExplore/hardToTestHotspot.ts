import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"

const minimumConstructions = 2

const hardToTestAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const constructions = Array.filter(
    elements,
    (element) => element.name === "external-dependency-construction"
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
      const count = Array.filter(
        constructions,
        (element) => element.detection.location.path === filePath
      ).length

      const location = adviceLocation(filePath)
      const constructionItem = evidenceItem("external-dependency-construction", count)
      const evidence = Array.of(constructionItem)

      return new Advice({
        location,
        level: "file",
        title: "hard-to-test hotspot",
        remediation:
          "External collaborator construction is concentrated inside behaviour. Classify the dependency first, construct production adapters " +
          "at the composition root, and inject a port only when a real test adapter supplies the second implementation.",
        evidence
      })
    })
  )
}

export const hardToTestHotspot = deriveSignals(hardToTestAdvice)
