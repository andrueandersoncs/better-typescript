import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isFirstPartySymbol, unwrapExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const tagPropertyName = "_tag"

const strictTagComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const hasTagPropertyName = (expression: ts.PropertyAccessExpression): boolean =>
  expression.name.text === tagPropertyName

const tagPropertyAccess = (
  expression: ts.Expression
): Option.Option<ts.PropertyAccessExpression> =>
  pipe(
    unwrapExpression(expression),
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.filter(hasTagPropertyName)
  )

const stringLiteralExpression = (
  expression: ts.Expression
): Option.Option<ts.StringLiteralLike> =>
  pipe(
    unwrapExpression(expression),
    Option.liftPredicate(ts.isStringLiteralLike)
  )

const hasTagPropertyOperand = (expression: ts.Expression): boolean =>
  pipe(tagPropertyAccess(expression), Option.isSome)

const hasStringLiteralOperand = (expression: ts.Expression): boolean =>
  pipe(stringLiteralExpression(expression), Option.isSome)

const isSchemaTagComparisonBinary = (node: ts.BinaryExpression): boolean => {
  const isStrictComparison = HashSet.has(
    strictTagComparisonOperators,
    node.operatorToken.kind
  )

  const leftTagRightString =
    hasTagPropertyOperand(node.left) && hasStringLiteralOperand(node.right)

  const leftStringRightTag =
    hasStringLiteralOperand(node.left) && hasTagPropertyOperand(node.right)

  const hasTagComparison = leftTagRightString || leftStringRightTag

  return isStrictComparison && hasTagComparison
}

const isSchemaTagComparison = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(node),
    Option.exists(isSchemaTagComparisonBinary)
  )

const constituentIsFirstParty = (type: ts.Type): boolean => {
  const aliasSymbol = Option.fromNullable(type.aliasSymbol)
  const typeSymbol = type.getSymbol()
  const ownSymbol = Option.fromNullable(typeSymbol)
  const symbol = Option.orElse(aliasSymbol, Function.constant(ownSymbol))

  return Option.exists(symbol, isFirstPartySymbol)
}

// Restrict this rewrite to declared classes because Schema.is(Class) uses instanceof semantics that would invert plain JSON or third-party unions.
const schemaIsMatches = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const match = detection(context)

  const matches = (
    expression: ts.BinaryExpression
  ): ReadonlyArray<Detection> => {
    const leftAccess = tagPropertyAccess(expression.left)
    const rightAccess = tagPropertyAccess(expression.right)
    const accessOptions = Array.make(leftAccess, rightAccess)
    const tagAccess = Option.firstSomeOf(accessOptions)

    const isFirstParty = Option.exists(tagAccess, (access) => {
      const checkedType = context.checker.getTypeAtLocation(access.expression)

      const constituents = checkedType.isUnion()
        ? checkedType.types
        : Array.of(checkedType)

      return Array.every(constituents, constituentIsFirstParty)
    })

    if (!isFirstParty) {
      return Array.empty()
    }

    const valueText = pipe(
      tagAccess,
      Option.map((access) => access.expression.getText(sourceFile)),
      Option.getOrElse(Function.constant("the value"))
    )

    const operatorText = expression.operatorToken.getText(sourceFile)
    const leftLiteral = stringLiteralExpression(expression.left)
    const rightLiteral = stringLiteralExpression(expression.right)
    const literalOptions = Array.make(leftLiteral, rightLiteral)

    const tagText = pipe(
      Option.firstSomeOf(literalOptions),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant("$tag"))
    )

    const schemaIsCheck = `Schema.is($schema)(${valueText})`

    const isNegated =
      expression.operatorToken.kind ===
      ts.SyntaxKind.ExclamationEqualsEqualsToken

    const suggestion = isNegated ? `!${schemaIsCheck}` : schemaIsCheck

    const value194 = match({
      node: expression,
      message: `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
      hint:
        `Replace the tag check with ${suggestion}, using the Effect Schema class for ` +
        `"${tagText}".`
    })

    return Array.of(value194)
  }

  return matches
}

const values195 = Array.of(ts.SyntaxKind.BinaryExpression)
const check = nodeCheck(values195)(isSchemaTagComparison)(schemaIsMatches)

export const preferEffectSchemaIs: Check = check

export const preferEffectSchemaIsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-schema-is")
