import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"
const newExpressionKind = ts.SyntaxKind.NewExpression

const newErrorElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.NewExpression): ReadonlyArray<Detection> => {
    const isBareError = pipe(
      Option.liftPredicate(ts.isIdentifier)(node.expression),
      Option.exists((expression) => expression.text === "Error")
    )

    const reported = element({
      node,
      message: "Avoid using new Error() directly.",
      hint:
        "Declare a custom error with Effect Schema.TaggedErrorClass, then use new CustomError() " +
        "instead of bare new Error()."
    })

    return isBareError ? Array.of(reported) : Array.empty()
  }

  return matches
}

const newExpressionKinds = Array.of(newExpressionKind)

export const noNewError = defineCheck(
  "no-new-error",
  newExpressionKinds,
  ts.isNewExpression,
  newErrorElements
)
