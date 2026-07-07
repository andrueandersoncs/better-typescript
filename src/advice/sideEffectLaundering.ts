import { Array, Stream, pipe } from "effect"
import {
  AdviceElement,
  adviceLocation,
  byFile,
  collidingLines,
  deriveSignals
} from "../detectors/summary.js"
import type { FileDetections, NamedDetection } from "../detectors/summary.js"

const collisionAdvice = (file: FileDetections): AdviceElement => {
  const location = adviceLocation(file.path)
  const evidence = collidingLines(file.elements)

  return new AdviceElement({
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
}

const collidingFileAdvice = (
  signals: ReadonlyArray<NamedDetection>
): ReadonlyArray<AdviceElement> =>
  pipe(
    byFile(signals),
    Array.filter((file) => collidingLines(file.elements).length >= 2),
    Array.map(collisionAdvice)
  )

export const sideEffectLaundering = (
  signals: Stream.Stream<NamedDetection, Error>
): Stream.Stream<AdviceElement, Error> =>
  deriveSignals(collidingFileAdvice)(signals)
