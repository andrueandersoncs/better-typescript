import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"

const hypotheticalSeamAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const seams = Array.filter(elements, (element) => element.name === "single-adapter-seams")

  const paths = pipe(
    seams,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.map(paths, (filePath) => {
    const count = Array.filter(
      seams,
      (element) => element.detection.location.path === filePath
    ).length

    const location = adviceLocation(filePath)
    const seamItem = evidenceItem("single-adapter-seams", count)
    const evidence = Array.of(seamItem)

    return new Advice({
      location,
      level: "file",
      title: "hypothetical seam",
      remediation:
        "These injected behavioural interfaces have one production adapter and no test adapter. " +
        "Remove the speculative port and keep the seam internal until a second implementation actually varies across it.",
      evidence
    })
  })
}

export const hypotheticalSeam = deriveSignals(hypotheticalSeamAdvice)
