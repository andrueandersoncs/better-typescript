import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

const implicitReturnMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Detection> => {
    if (!ts.isBlock(arrowFunction.body)) return Array.empty()
    const hasOneStatement = arrowFunction.body.statements.length === 1
    const firstStatement = arrowFunction.body.statements[0]

    const hasSingleValueReturn =
      hasOneStatement &&
      pipe(
        Option.liftPredicate(ts.isReturnStatement)(firstStatement),
        Option.flatMap((statement) => Option.fromNullishOr(statement.expression)),
        Option.isSome
      )

    const reported = match({
      node: arrowFunction.body,
      message: "Avoid arrow function block bodies that only return a value.",
      hint:
        "Replace this with an implicit return by removing the return statement and function " +
        "body braces. Wrap object literals in parentheses when needed."
    })

    return hasSingleValueReturn ? Array.of(reported) : Array.empty()
  }

  return matches
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

export const preferImplicitReturn = makeCheck(
  "prefer-implicit-return",
  arrowFunctionKinds,
  ts.isArrowFunction,
  implicitReturnMatches
)
