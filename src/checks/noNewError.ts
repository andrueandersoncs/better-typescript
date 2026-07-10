import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

const newExpressionKind = ts.SyntaxKind.NewExpression

const newErrorElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.NewExpression): ReadonlyArray<Detection> => {
    const isBareError = pipe(
      Option.liftPredicate(ts.isIdentifier)(node.expression),
      Option.exists((expression) => expression.text === "Error")
    )

    return isBareError
      ? [
          element({
            node,
            message: "Avoid using new Error() directly.",
            hint:
              "Declare a custom error with Effect Schema.TaggedError, then use new CustomError() " +
              "instead of bare new Error()."
          })
        ]
      : []
  }

  return matches
}

export const noNewError: Check = nodeCheck([newExpressionKind])(
  ts.isNewExpression
)(newErrorElements)
