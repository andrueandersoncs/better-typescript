import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule } from "./types.js"

const ruleId = "no-for-of-loops"

export const noForOfLoops: Rule = {
  id: ruleId,
  description: "Disallow for..of loops in favor of immutable collection operations.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isForOfStatement),
        Stream.map((forOfStatement) =>
          createRuleMatch(context, {
            ruleId,
            node: forOfStatement,
            message: "Avoid imperative logic in for..of loops.",
            hint:
              "Use immutable collection logic such as Array.prototype.map(), " +
              "Array.prototype.reduce(), Array.prototype.filter(), Array.prototype.flatMap(), " +
              "or Streams for async iterables instead."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}
