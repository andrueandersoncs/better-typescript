import { Array, Function, Option, Struct, pipe } from "effect"
import { strictEqual } from "../equivalence.js"
import * as ts from "typescript"
import type { FunctionDefinition } from "./functionDefinition.js"
import { isExpressionBody } from "./isExpressionBody.js"
import { returnStatementExpression } from "./returnStatementExpression.js"

const expressionBodiedArrow = (scan: FunctionDefinition) =>
  pipe(
    Option.liftPredicate(ts.isArrowFunction)(scan),
    Option.map(Struct.get("body")),
    Option.filter(isExpressionBody)
  )

const returnStatements = (body: ts.Block) => Array.filter(body.statements, ts.isReturnStatement)

const hasSingleReturn = (returns: ReadonlyArray<ts.ReturnStatement>) =>
  pipe(returns, Array.length, strictEqual(1))

const singleReturnExpression = (scan: FunctionDefinition) =>
  pipe(
    Option.fromNullishOr(scan.body),
    Option.filter(ts.isBlock),
    Option.map(returnStatements),
    Option.filter(hasSingleReturn),
    Option.flatMap(Array.head),
    Option.flatMap(returnStatementExpression)
  )

export const returnedExpression = (scan: FunctionDefinition) => {
  const blockReturn = singleReturnExpression(scan)

  return pipe(expressionBodiedArrow(scan), Option.orElse(Function.constant(blockReturn)))
}
