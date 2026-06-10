import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule } from "./types.js"

const ruleId = "no-throw"

export const noThrow: Rule = {
  id: ruleId,
  description: "Disallow throw statements in favor of Effect errors.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isThrowStatement),
        Stream.map((throwStatement) =>
          createRuleMatch(context, {
            ruleId,
            node: throwStatement,
            message: "Avoid throwing errors with throw.",
            hint:
              "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
              'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}
