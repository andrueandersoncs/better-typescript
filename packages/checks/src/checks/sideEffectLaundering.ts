import { Array, Effect } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  byFile,
  collidingLines,
  deriveSignals
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../defineCheck.js"

export const sideEffectLaundering = Effect.gen(function* () {
  const examples = yield* packageExamples("side-effect-laundering")

  const collidingFileAdvice = (signals: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const files = byFile(signals)

    return Array.flatMap(files, (file) => {
      const evidence = collidingLines(file.elements)
      const hasEnoughCollisions = evidence.length >= 2

      if (hasEnoughCollisions) {
        const location = adviceLocation(file.path)

        const advice = new Advice({
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

  return deriveSignals(collidingFileAdvice)
})
