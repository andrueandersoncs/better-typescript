import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule } from "./types.js"

const ruleId = "no-new-error"

export const noNewError: Rule = {
  id: ruleId,
  description: "Disallow direct Error construction in favor of Effect Schema tagged errors.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isNewExpression),
        Stream.filter(isBareErrorConstruction),
        Stream.map((newExpression) =>
          createRuleMatch(context, {
            ruleId,
            node: newExpression,
            message: "Avoid using new Error() directly.",
            hint:
              "Declare a custom error with Effect Schema.TaggedError, then use new CustomError() " +
              "instead of bare new Error()."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const isBareErrorConstruction = (newExpression: ts.NewExpression): boolean =>
  Option.match(Option.liftPredicate(ts.isIdentifier)(newExpression.expression), {
    onNone: () => false,
    onSome: (expression) => expression.text === "Error"
  })
