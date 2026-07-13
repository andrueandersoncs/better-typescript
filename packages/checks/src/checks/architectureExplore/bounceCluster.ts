import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  deriveSignals,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"

const minimumThinFiles = 3

const bounceAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const thin = Array.filter(elements, (element) => {
    const isPassThrough = element.name === "pass-through-wrappers"
    const isWideThin = element.name === "wide-thin-exports"

    return isPassThrough || isWideThin
  })

  const byDirectory = Array.groupBy(thin, (element) => {
    const filePath = element.detection.location.path
    const normalized = filePath.replaceAll("\\", "/")
    const index = normalized.lastIndexOf("/")

    return index === -1 ? normalized : normalized.slice(0, index)
  })

  return pipe(
    Object.entries(byDirectory),
    Array.flatMap(([directory, group]) => {
      const mappedPaths = Array.map(
        group,
        (element) => element.detection.location.path
      )

      const files = Array.dedupe(mappedPaths)

      if (files.length < minimumThinFiles) {
        return Array.empty()
      }

      const location = adviceLocation(directory)
      const thinModulesItem = evidenceItem("thin-modules", files.length)
      const signalsItem = evidenceItem("signals", group.length)
      const evidence = Array.make(thinModulesItem, signalsItem)

      const advice = new Advice({
        location,
        level: "directory",
        title: "bounce cluster",
        remediation:
          "Understanding one concept requires bouncing across thin Modules in this directory. " +
          "Collapse the cluster into one deeper Module so locality returns.",
        evidence
      })

      return Array.of(advice)
    })
  )
}

export const bounceCluster = deriveSignals(bounceAdvice)
