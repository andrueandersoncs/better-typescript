import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule } from "./types.js"

const ruleId = "no-switch-statements"

export const noSwitchStatements: Rule = {
  id: ruleId,
  description: "Disallow switch statements in favor of Effect Match.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isSwitchStatement),
        Stream.map((switchStatement) =>
          createRuleMatch(context, {
            ruleId,
            node: switchStatement,
            message: "Avoid switch statements.",
            hint:
              "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
              "so every case is handled explicitly."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}
