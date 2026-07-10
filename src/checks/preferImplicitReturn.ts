import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { returnedExpression } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

type ArrowFunctionWithBlockBody = ts.ArrowFunction & {
  readonly body: ts.Block
}

// The context stage runs once per file, so the hoisted match is shared by every ArrowFunction the report wiring feeds to matches.
const implicitReturnMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (
    arrowFunction: ts.ArrowFunction
  ): ReadonlyArray<Detection> => {
    if (!ts.isBlock(arrowFunction.body)) return []
    const hasOneStatement = arrowFunction.body.statements.length === 1
    const firstStatement = arrowFunction.body.statements[0]
    const hasSingleValueReturn =
      hasOneStatement &&
      pipe(
        Option.liftPredicate(ts.isReturnStatement)(firstStatement),
        Option.flatMap(returnedExpression),
        Option.isSome
      )

    return hasSingleValueReturn
      ? [
          match({
            node: arrowFunction.body,
            message:
              "Avoid arrow function block bodies that only return a value.",
            hint:
              "Replace this with an implicit return by removing the return statement and function " +
              "body braces. Wrap object literals in parentheses when needed."
          })
        ]
      : []
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.ArrowFunction])(ts.isArrowFunction)(
  implicitReturnMatches
)

export const preferImplicitReturn: Check = check
