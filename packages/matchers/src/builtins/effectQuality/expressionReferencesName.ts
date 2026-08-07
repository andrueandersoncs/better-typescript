import { Array, Function, Match, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

export const expressionReferencesName =
  (name: string) =>
  (expression: ts.Expression): boolean => {
    const current = unwrapTransparentExpression(expression)
    const recur = expressionReferencesName(name)
    const identifierIsName = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual(name))

    const propertyAccessReferencesName = (access: ts.PropertyAccessExpression) =>
      recur(access.expression)

    const elementAccessReferencesName = (access: ts.ElementAccessExpression) =>
      recur(access.expression)

    const asExpressionReferencesName = (asExpression: ts.AsExpression) =>
      recur(asExpression.expression)

    const satisfiesExpressionReferencesName = (satisfiesExpression: ts.SatisfiesExpression) =>
      recur(satisfiesExpression.expression)

    const parenthesizedReferencesName = (parenthesized: ts.ParenthesizedExpression) =>
      recur(parenthesized.expression)

    const nonNullReferencesName = (nonNull: ts.NonNullExpression) => recur(nonNull.expression)

    const callArgumentsReferenceName = (call: ts.CallExpression) =>
      Array.some(call.arguments, recur)

    return pipe(
      Match.value(current),
      Match.when(ts.isIdentifier, identifierIsName),
      Match.when(ts.isPropertyAccessExpression, propertyAccessReferencesName),
      Match.when(ts.isElementAccessExpression, elementAccessReferencesName),
      Match.when(ts.isAsExpression, asExpressionReferencesName),
      Match.when(ts.isSatisfiesExpression, satisfiesExpressionReferencesName),
      Match.when(ts.isParenthesizedExpression, parenthesizedReferencesName),
      Match.when(ts.isNonNullExpression, nonNullReferencesName),
      Match.when(ts.isConditionalExpression, (conditional) => {
        const whenTrue = recur(conditional.whenTrue)
        const whenFalse = recur(conditional.whenFalse)
        const flags = Array.make(whenTrue, whenFalse)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isBinaryExpression, (binary) => {
        const left = recur(binary.left)
        const right = recur(binary.right)
        const flags = Array.make(left, right)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isCallExpression, callArgumentsReferenceName),
      Match.orElse(Function.constFalse)
    )
  }
