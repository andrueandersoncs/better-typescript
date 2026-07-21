import { Array, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const newExpressionKind = ts.SyntaxKind.NewExpression

const newErrorElements = (context: CheckContext) => {
  const element = makeDetection(context)

  const matches = (node: ts.NewExpression): ReadonlyArray<Detection> => {
    const isErrorIdentifier = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Error"))

    const isBareError = pipe(
      Option.liftPredicate(ts.isIdentifier)(node.expression),
      Option.exists(isErrorIdentifier)
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

export const noNewError = makeCheck(
  "no-new-error",
  newExpressionKinds,
  ts.isNewExpression,
  newErrorElements
)
