import { Array, Function, HashSet, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { isFirstPartySymbol, unwrapExpression } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// PreferEffectSchemaIsFact records tag comparison text because guidance rewrites equality.
export const PreferEffectSchemaIsFact = Schema.Struct({
  valueText: Schema.String,
  operatorText: Schema.String,
  tagText: Schema.String,
  isNegated: Schema.Boolean
})

export interface PreferEffectSchemaIsFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaIsFact
> {}

const tagPropertyName = "_tag"

const strictTagComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const hasTagPropertyName = (expression: ts.PropertyAccessExpression) =>
  strictEqual(tagPropertyName)(expression.name.text)

const tagPropertyAccess = (expression: ts.Expression) =>
  pipe(
    unwrapExpression(expression),
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.filter(hasTagPropertyName)
  )

const stringLiteralExpression = (expression: ts.Expression) =>
  pipe(unwrapExpression(expression), Option.liftPredicate(ts.isStringLiteralLike))

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
  const sourceFile = context.sourceFile

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

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

export const preferEffectSchemaIsMatcher =
  nodeMatcher(binaryExpressionKinds)(isSchemaTagComparison)(schemaIsMatches)
