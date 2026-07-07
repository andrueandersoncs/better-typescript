import { Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { isFirstPartySymbol, unwrapExpression } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const tagPropertyName = "_tag"

const strictTagComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const hasTagPropertyName = (expression: ts.PropertyAccessExpression): boolean =>
  expression.name.text === tagPropertyName

const tagPropertyAccess = (
  expression: ts.Expression
): Option.Option<ts.PropertyAccessExpression> => {
  const unwrapped = unwrapExpression(expression)

  return pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.filter(hasTagPropertyName)
  )
}

const stringLiteralExpression = (
  expression: ts.Expression
): Option.Option<ts.StringLiteralLike> => {
  const unwrapped = unwrapExpression(expression)

  return Option.liftPredicate(ts.isStringLiteralLike)(unwrapped)
}

const hasTagPropertyOperand = (expression: ts.Expression): boolean => {
  const access = tagPropertyAccess(expression)

  return Option.isSome(access)
}

const hasStringLiteralOperand = (expression: ts.Expression): boolean => {
  const literal = stringLiteralExpression(expression)

  return Option.isSome(literal)
}

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

const checkedValueText =
  (sourceFile: ts.SourceFile) =>
  (access: ts.PropertyAccessExpression): string =>
    access.expression.getText(sourceFile)

const constituentIsFirstParty = (type: ts.Type): boolean => {
  const aliasSymbol = Option.fromNullable(type.aliasSymbol)
  const typeSymbol = type.getSymbol()
  const ownSymbol = Option.fromNullable(typeSymbol)
  const symbol = Option.orElse(aliasSymbol, Function.constant(ownSymbol))

  return Option.exists(symbol, isFirstPartySymbol)
}

// Schema.is(Class) uses instanceof semantics: rewriting a _tag check on a type the project does not declare (plain JSON, third-party unions) would invert its runtime result.
const isFirstPartyTagAccess =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression): boolean => {
    const checkedType = checker.getTypeAtLocation(access.expression)
    const constituents = checkedType.isUnion()
      ? checkedType.types
      : [checkedType]

    return constituents.every(constituentIsFirstParty)
  }

// The context stage runs once per file, so every partial below is shared by all BinaryExpressions the report wiring feeds to matches.
const schemaIsMatches = (context: RuleContext) => {
  const sourceFile = context.sourceFile
  const match = detection(context)
  const isFirstPartyAccess = isFirstPartyTagAccess(context.checker)
  const valueTextOf = checkedValueText(sourceFile)

  const matches = (
    expression: ts.BinaryExpression
  ): ReadonlyArray<Detection> => {
    const leftAccess = tagPropertyAccess(expression.left)
    const rightAccess = tagPropertyAccess(expression.right)
    const accessOptions = [leftAccess, rightAccess]
    const tagAccess = Option.firstSomeOf(accessOptions)
    const isFirstParty = Option.exists(tagAccess, isFirstPartyAccess)

    if (!isFirstParty) {
      return []
    }
    const valueText = pipe(
      tagAccess,
      Option.map(valueTextOf),
      Option.getOrElse(Function.constant("the value"))
    )
    const operatorText = expression.operatorToken.getText(sourceFile)
    const leftLiteral = stringLiteralExpression(expression.left)
    const rightLiteral = stringLiteralExpression(expression.right)
    const literalOptions = [leftLiteral, rightLiteral]
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

    return [
      match({
        node: expression,
        message: `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
        hint:
          `Replace the tag check with ${suggestion}, using the Effect Schema class for ` +
          `"${tagText}".`
      })
    ]
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.BinaryExpression])(
  isSchemaTagComparison
)(schemaIsMatches)

export const preferEffectSchemaIs: RuleCheck = check
