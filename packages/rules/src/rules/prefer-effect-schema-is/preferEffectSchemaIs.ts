import { binaryExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, HashSet, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { isFirstPartySymbol } from "../../internal/support/isFirstPartySymbol.js"
import { strictEqual } from "../../internal/equivalence.js"
import { tagPropertyAccess } from "./tagPropertyAccess.js"
import { stringLiteralExpression } from "./stringLiteralExpression.js"

// PreferEffectSchemaIsFact exists because its fields form one stable data contract used by the linter.
export const PreferEffectSchemaIsFact = Schema.Struct({
  valueText: Schema.String,
  operatorText: Schema.String,
  tagText: Schema.String,
  isNegated: Schema.Boolean
})

export interface PreferEffectSchemaIsFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaIsFact
> {}

const strictTagComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const hasTagPropertyOperand = (expression: ts.Expression) =>
  pipe(tagPropertyAccess(expression), Option.isSome)

const hasStringLiteralOperand = (expression: ts.Expression) =>
  pipe(stringLiteralExpression(expression), Option.isSome)

const isSchemaTagComparisonBinary = (node: ts.BinaryExpression) => {
  const isStrictComparison = HashSet.has(strictTagComparisonOperators, node.operatorToken.kind)
  const leftTagRightString = hasTagPropertyOperand(node.left) && hasStringLiteralOperand(node.right)
  const leftStringRightTag = hasStringLiteralOperand(node.left) && hasTagPropertyOperand(node.right)
  const hasTagComparison = leftTagRightString || leftStringRightTag

  return isStrictComparison && hasTagComparison
}

const isSchemaTagComparison = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(node),
    Option.exists(isSchemaTagComparisonBinary)
  )

const constituentIsFirstParty = (type: ts.Type) => {
  const aliasSymbol = Option.fromNullishOr(type.aliasSymbol)
  const typeSymbol = type.getSymbol()
  const ownSymbol = Option.fromNullishOr(typeSymbol)
  const symbol = Option.orElse(aliasSymbol, Function.constant(ownSymbol))

  return Option.exists(symbol, isFirstPartySymbol)
}

const schemaIsMatches = (context: MatchContext) => {
  const matchSchemaTagComparison = (expression: ts.BinaryExpression) => {
    const leftAccess = tagPropertyAccess(expression.left)
    const rightAccess = tagPropertyAccess(expression.right)
    const accessOptions = Array.make(leftAccess, rightAccess)
    const tagAccess = Option.firstSomeOf(accessOptions)

    const isFirstParty = Option.exists(tagAccess, (access) => {
      const checkedType = context.checker.getTypeAtLocation(access.expression)
      const constituents = checkedType.isUnion() ? checkedType.types : Array.of(checkedType)

      return Array.every(constituents, constituentIsFirstParty)
    })

    if (!isFirstParty) {
      return Array.empty()
    }

    const valueText = pipe(
      tagAccess,
      Option.map((access) => access.expression.getText(context.sourceFile)),
      Option.getOrElse(Function.constant("the value"))
    )

    const operatorText = expression.operatorToken.getText(context.sourceFile)
    const leftLiteral = stringLiteralExpression(expression.left)
    const rightLiteral = stringLiteralExpression(expression.right)
    const literalOptions = Array.make(leftLiteral, rightLiteral)

    const tagText = pipe(
      Option.firstSomeOf(literalOptions),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant("$tag"))
    )

    const isNegated = strictEqual(ts.SyntaxKind.ExclamationEqualsEqualsToken)(
      expression.operatorToken.kind
    )

    const fact = PreferEffectSchemaIsFact.make({
      valueText,
      operatorText,
      tagText,
      isNegated
    })

    const match = makeNodeMatch(expression, fact)

    return Array.of(match)
  }

  return matchSchemaTagComparison
}

export const preferEffectSchemaIsScanner =
  makeNodeScanner(binaryExpressionKinds)(isSchemaTagComparison)(schemaIsMatches)
