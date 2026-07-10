import { Array, Stream } from "effect"
import {
  AdviceElement,
  adviceLocation,
  byFile,
  collidingLines,
  deriveSignals
} from "../detectors/summary.js"
import type { NamedDetection } from "../detectors/summary.js"

const collidingFileAdvice = (
  signals: ReadonlyArray<NamedDetection>
): ReadonlyArray<AdviceElement> => {
  const files = byFile(signals)

  return Array.flatMap(files, (file) => {
    const evidence = collidingLines(file.elements)
    const hasEnoughCollisions = evidence.length >= 2

    if (hasEnoughCollisions) {
      const location = adviceLocation(file.path)
      const advice = new AdviceElement({
        location,
        level: "file",
        title: "colliding fixes on shared expressions",
        remediation:
          "Multiple rules dispute the same expressions: each expression is doing two jobs, and " +
          "any edit that appeases one rule trips another. Restructure instead of appeasing — " +
          "split the expression, or annotate the value with the consuming library's own " +
          "callback type so the contract is the consumer's.",
        evidence
      })

      return [advice]
    }

    return []
  })
}

export const sideEffectLaundering = (
  signals: Stream.Stream<NamedDetection, Error>
): Stream.Stream<AdviceElement, Error> =>
  deriveSignals(collidingFileAdvice)(signals)
