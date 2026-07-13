import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  deriveSignals,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"

const minimumWrappers = 1
const minimumWrapperDensity = 3

const pathOf = (element: NamedDetection): string =>
  element.detection.location.path

const isCheck =
  (name: string) =>
  (element: NamedDetection): boolean =>
    element.name === name

const countAt =
  (elements: ReadonlyArray<NamedDetection>) =>
  (filePath: string): number =>
    Array.filter(elements, (element) => pathOf(element) === filePath).length

const deletionAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const wrappers = Array.filter(elements, isCheck("pass-through-wrappers"))
  const wideThin = Array.filter(elements, isCheck("wide-thin-exports"))
  const graphs = Array.filter(elements, isCheck("import-call-graph"))
  const singleUse = Array.filter(elements, isCheck("single-use-pure-export"))

  const mappedWrapperPaths = Array.map(wrappers, pathOf)
  const wrapperPaths = Array.dedupe(mappedWrapperPaths)

  const qualifies = (filePath: string): boolean => {
    const wrapperCount = countAt(wrappers)(filePath)
    const hasMinimumWrappers = wrapperCount >= minimumWrappers
    const hasWideThin = countAt(wideThin)(filePath) > 0
    const denseWrappers = wrapperCount >= minimumWrapperDensity

    const wideOrDenseConditions = Array.make(hasWideThin, denseWrappers)
    const wideOrDense = Array.some(wideOrDenseConditions, Boolean)

    const qualifyConditions = Array.make(hasMinimumWrappers, wideOrDense)

    return Array.every(qualifyConditions, Boolean)
  }

  return pipe(
    wrapperPaths,
    Array.filter(qualifies),
    Array.map((filePath) => {
      const wrapperCount = countAt(wrappers)(filePath)
      const wideCount = countAt(wideThin)(filePath)
      const graphCount = countAt(graphs)(filePath)
      const singleUseCount = countAt(singleUse)(filePath)

      const wrapperItem = evidenceItem("pass-through-wrappers", wrapperCount)
      const wideItem = evidenceItem("wide-thin-exports", wideCount)
      const graphItem = evidenceItem("import-call-graph", graphCount)

      const singleUseItem = evidenceItem(
        "single-use-pure-export",
        singleUseCount
      )

      const observations = Array.make(
        wrapperItem,
        wideItem,
        graphItem,
        singleUseItem
      )

      const evidence = Array.filter(observations, (item) => item.count > 0)
      const location = adviceLocation(filePath)

      return new Advice({
        location,
        level: "file",
        title: "deletion-test shallowness",
        remediation:
          "This Module fails the deletion test: removing it would move Pass-through Wrappers and " +
          "Wide Thin Export Surface complexity into callers. Deepen one interface here so leverage " +
          "and locality concentrate in this Module.",
        evidence
      })
    })
  )
}

export const deletionTestShallowness = deriveSignals(deletionAdvice)
