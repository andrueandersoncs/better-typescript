import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../support/tsNode.js"

export const statusPropertyNames = Array.make("status", "ok", "statusText")

const statusAccessOfExpression = (current: ts.Expression): boolean =>
  pipe(
    Match.value(current),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const nameHit = Array.contains(statusPropertyNames, access.name.text)
      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(nameHit, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isElementAccessExpression, (access) => {
      const argument = unwrapTransparentExpression(access.argumentExpression)

      const literalStatus = pipe(
        Option.liftPredicate(ts.isStringLiteralLike)(argument),
        Option.exists((literal) => Array.contains(statusPropertyNames, literal.text))
      )

      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(literalStatus, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isCallExpression, (call) => {
      const callee = unwrapTransparentExpression(call.expression)
      const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

      return pipe(
        propertyAccess,
        Option.exists((access) => Array.contains(statusPropertyNames, access.name.text))
      )
    }),
    Match.when(ts.isBinaryExpression, (binary) => {
      const left = expressionAccessesStatus(binary.left)
      const right = expressionAccessesStatus(binary.right)
      const flags = Array.make(left, right)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isPrefixUnaryExpression, (unary) => expressionAccessesStatus(unary.operand)),
    Match.when(ts.isPostfixUnaryExpression, (unary) => expressionAccessesStatus(unary.operand)),
    Match.when(ts.isParenthesizedExpression, (parenthesized) =>
      expressionAccessesStatus(parenthesized.expression)
    ),
    Match.when(ts.isAsExpression, (asExpression) =>
      expressionAccessesStatus(asExpression.expression)
    ),
    Match.when(ts.isSatisfiesExpression, (satisfiesExpression) =>
      expressionAccessesStatus(satisfiesExpression.expression)
    ),
    Match.when(ts.isConditionalExpression, (conditional) => {
      const condition = expressionAccessesStatus(conditional.condition)
      const whenTrue = expressionAccessesStatus(conditional.whenTrue)
      const whenFalse = expressionAccessesStatus(conditional.whenFalse)
      const flags = Array.make(condition, whenTrue, whenFalse)

      return Array.some(flags, Boolean)
    }),
    Match.orElse(Function.constFalse)
  )

export const expressionAccessesStatus = (expression: ts.Expression): boolean =>
  pipe(expression, unwrapTransparentExpression, statusAccessOfExpression)
