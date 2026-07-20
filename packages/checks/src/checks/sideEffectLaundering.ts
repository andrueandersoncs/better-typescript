import { Array, Effect } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  byFile,
  collidingLines,
  deriveSignals
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../defineCheck.js"

export const sideEffectLaunderingExamples = packageExamples("side-effect-laundering")

const collidingFileAdvice = (signals: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const files = byFile(signals)

  return Array.flatMap(files, (file) => {
    const evidence = collidingLines(file.elements)
    const hasEnoughCollisions = evidence.length >= 2

    if (hasEnoughCollisions) {
      const location = makeAdviceLocation(file.path)
      const examples = sideEffectLaunderingExamples

      const advice = Advice.make({
        location,
        level: "file",
        title: "colliding fixes on shared expressions",
        remediation:
          "Multiple rules dispute the same expressions: each expression is doing two jobs, and " +
          "any edit that appeases one rule trips another. Restructure instead of appeasing — " +
          "split the expression, or annotate the value with the consuming library's own " +
          "callback type so the contract is the consumer's.",
        evidence,
        examples
      })

      return Array.of(advice)
    }

    return Array.empty()
  })
}

export const sideEffectLaundering = Effect.fn("SideEffectLaundering.derive")(
  deriveSignals(collidingFileAdvice)
)
