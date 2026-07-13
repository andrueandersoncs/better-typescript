import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  deriveSignals,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"

const minimumLeaks = 2

const leakedSeamAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const leaks = Array.filter(
    elements,
    (element) => element.name === "seam-leakage-evidence"
  )

  const mappedPaths = Array.map(
    leaks,
    (element) => element.detection.location.path
  )

  const paths = Array.dedupe(mappedPaths)

  return pipe(
    paths,
    Array.filter((filePath) => {
      const count = Array.filter(
        leaks,
        (element) => element.detection.location.path === filePath
      ).length

      return count >= minimumLeaks
    }),
    Array.map((filePath) => {
      const count = Array.filter(
        leaks,
        (element) => element.detection.location.path === filePath
      ).length

      const location = adviceLocation(filePath)
      const leakItem = evidenceItem("seam-leakage-evidence", count)
      const evidence = Array.of(leakItem)

      return new Advice({
        location,
        level: "file",
        title: "leaked seam",
        remediation:
          "Modules leak across their seam via deep imports into internals. " +
          "Route through a public interface at the seam so coupling stays intentional.",
        evidence
      })
    })
  )
}

export const leakedSeam = deriveSignals(leakedSeamAdvice)
