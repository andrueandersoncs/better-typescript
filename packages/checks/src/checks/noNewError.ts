import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
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
        "Declare a custom error with Effect Schema.TaggedError, then use new CustomError() " +
        "instead of bare new Error()."
    })

    return isBareError ? Array.of(reported) : Array.empty()
  }

  return matches
}

const newExpressionKinds = Array.of(newExpressionKind)

export const noNewError: Check = nodeCheck(newExpressionKinds)(
  ts.isNewExpression
)(newErrorElements)

export const noNewErrorExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-new-error")
