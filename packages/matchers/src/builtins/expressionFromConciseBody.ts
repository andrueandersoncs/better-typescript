import { Array, Function, Option, Struct, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { isExpressionBody } from "../support/isExpressionBody.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"

export const expressionFromConciseBody = (body: ts.ConciseBody) => {
  const expressionBody = pipe(
    Option.some(body),
    Option.filter(isExpressionBody),
    Option.map(unwrapTransparentExpression)
  )

  const singleStatementBlock = (block: ts.Block) => strictEqual(1)(block.statements.length)

  const blockBody = pipe(
    Option.some(body),
    Option.filter(ts.isBlock),
    Option.filter(singleStatementBlock),
    Option.flatMap(Function.flow(Struct.get("statements"), Array.head)),
    Option.filter(ts.isReturnStatement),
    Option.flatMap(Function.flow(Struct.get("expression"), Option.fromNullishOr)),
    Option.map(unwrapTransparentExpression)
  )

  return pipe(expressionBody, Option.orElse(Function.constant(blockBody)))
}
