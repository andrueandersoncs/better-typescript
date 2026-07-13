import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { returnedExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

type ArrowFunctionWithBlockBody = ts.ArrowFunction & {
  readonly body: ts.Block
}

const implicitReturnMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (
    arrowFunction: ts.ArrowFunction
  ): ReadonlyArray<Detection> => {
    if (!ts.isBlock(arrowFunction.body)) return Array.empty()
    const hasOneStatement = arrowFunction.body.statements.length === 1
    const firstStatement = arrowFunction.body.statements[0]

    const hasSingleValueReturn =
      hasOneStatement &&
      pipe(
        Option.liftPredicate(ts.isReturnStatement)(firstStatement),
        Option.flatMap(returnedExpression),
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
const check = nodeCheck(arrowFunctionKinds)(ts.isArrowFunction)(implicitReturnMatches)

export const preferImplicitReturn: Check = check

export const preferImplicitReturnExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-implicit-return")
