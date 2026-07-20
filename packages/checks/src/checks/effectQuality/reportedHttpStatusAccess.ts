import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../support/tsNode.js"

export const statusPropertyNames = Array.make("status", "ok", "statusText")

const literalIsStatusProperty = (literal: ts.StringLiteralLike) =>
  Array.contains(statusPropertyNames, literal.text)

const propertyAccessNameIsStatus = (access: ts.PropertyAccessExpression) =>
  Array.contains(statusPropertyNames, access.name.text)

const prefixUnaryAccessesStatus = (unary: ts.PrefixUnaryExpression) =>
  expressionAccessesStatus(unary.operand)

const postfixUnaryAccessesStatus = (unary: ts.PostfixUnaryExpression) =>
  expressionAccessesStatus(unary.operand)

const parenthesizedAccessesStatus = (parenthesized: ts.ParenthesizedExpression) =>
  expressionAccessesStatus(parenthesized.expression)

const asExpressionAccessesStatus = (asExpression: ts.AsExpression) =>
  expressionAccessesStatus(asExpression.expression)

const satisfiesExpressionAccessesStatus = (satisfiesExpression: ts.SatisfiesExpression) =>
  expressionAccessesStatus(satisfiesExpression.expression)

const statusAccessOfExpression = (current: ts.Expression): boolean =>
  pipe(
    Match.value(current),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const nameHit = propertyAccessNameIsStatus(access)
      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(nameHit, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isElementAccessExpression, (access) => {
      const argument = unwrapTransparentExpression(access.argumentExpression)

      const literalStatus = pipe(
        Option.liftPredicate(ts.isStringLiteralLike)(argument),
        Option.exists(literalIsStatusProperty)
      )

      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(literalStatus, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isCallExpression, (call) => {
      const callee = unwrapTransparentExpression(call.expression)
      const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

      return pipe(propertyAccess, Option.exists(propertyAccessNameIsStatus))
    }),
    Match.when(ts.isBinaryExpression, (binary) => {
      const left = expressionAccessesStatus(binary.left)
      const right = expressionAccessesStatus(binary.right)
      const flags = Array.make(left, right)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isPrefixUnaryExpression, prefixUnaryAccessesStatus),
    Match.when(ts.isPostfixUnaryExpression, postfixUnaryAccessesStatus),
    Match.when(ts.isParenthesizedExpression, parenthesizedAccessesStatus),
    Match.when(ts.isAsExpression, asExpressionAccessesStatus),
    Match.when(ts.isSatisfiesExpression, satisfiesExpressionAccessesStatus),
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
