import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { isExpressionBody } from "../support/isExpressionBody.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { isForwardingInvocation } from "./isForwardingInvocation.js"

const headStatement = (block: ts.Block) => Array.head(block.statements)

const returnInvocationExpression = Function.flow(
  Struct.get<ts.ReturnStatement, "expression">("expression"),
  Option.fromNullishOr,
  Option.map(unwrapExpression),
  Option.filter(isForwardingInvocation)
)

const yieldedInvocationExpression = Function.flow(
  Struct.get<ts.YieldExpression, "expression">("expression"),
  Option.fromNullishOr,
  Option.map(unwrapExpression),
  Option.filter(isForwardingInvocation)
)

const blockStatementInvocation = (statement: ts.ReturnStatement) => {
  const direct = returnInvocationExpression(statement)

  const yielded = pipe(
    statement.expression,
    Option.fromNullishOr,
    Option.filter(ts.isYieldExpression),
    Option.flatMap(yieldedInvocationExpression)
  )

  return pipe(direct, Option.orElse(Function.constant(yielded)))
}

export const invocationExpressionBody = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
) =>
  pipe(
    Option.fromNullishOr(node.body),
    Option.flatMap((body) => {
      const expressionInvocation = pipe(
        Option.liftPredicate(isExpressionBody)(body),
        Option.map(unwrapExpression),
        Option.filter(isForwardingInvocation)
      )

      const blockInvocation = pipe(
        Option.liftPredicate(ts.isBlock)(body),
        Option.flatMap(headStatement),
        Option.filter(ts.isReturnStatement),
        Option.flatMap(blockStatementInvocation)
      )

      return pipe(expressionInvocation, Option.orElse(Function.constant(blockInvocation)))
    })
  )
