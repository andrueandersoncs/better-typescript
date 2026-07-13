import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  deriveSignals,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"

const minimumHardwired = 2

const hardToTestAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const hardwired = Array.filter(
    elements,
    (element) => element.name === "hardwired-dependencies"
  )

  const mappedPaths = Array.map(
    hardwired,
    (element) => element.detection.location.path
  )

  const paths = Array.dedupe(mappedPaths)

  return pipe(
    paths,
    Array.filter((filePath) => {
      const count = Array.filter(
        hardwired,
        (element) => element.detection.location.path === filePath
      ).length

      return count >= minimumHardwired
    }),
    Array.map((filePath) => {
      const count = Array.filter(
        hardwired,
        (element) => element.detection.location.path === filePath
      ).length

      const location = adviceLocation(filePath)
      const hardwiredItem = evidenceItem("hardwired-dependencies", count)
      const evidence = Array.of(hardwiredItem)

      return new Advice({
        location,
        level: "file",
        title: "hard-to-test hotspot",
        remediation:
          "Hardwired Dependencies concentrate here, so the Module cannot be tested through its interface. " +
          "Introduce a seam with two adapters (production + test) and accept collaborators at the interface.",
        evidence
      })
    })
  )
}

export const hardToTestHotspot = deriveSignals(hardToTestAdvice)
