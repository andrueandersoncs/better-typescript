import { Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-is"

const tagPropertyName = "_tag"

const strictTagComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const isStrictTagComparisonOperator = (operator: ts.SyntaxKind): boolean =>
  HashSet.has(strictTagComparisonOperators, operator)

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

const hasTagOnLeft = (expression: ts.BinaryExpression): boolean =>
  hasTagPropertyOperand(expression.left) &&
  hasStringLiteralOperand(expression.right)

const hasTagOnRight = (expression: ts.BinaryExpression): boolean =>
  hasStringLiteralOperand(expression.left) &&
  hasTagPropertyOperand(expression.right)

const hasTagComparisonOperands = (expression: ts.BinaryExpression): boolean =>
  hasTagOnLeft(expression) || hasTagOnRight(expression)

const isTagComparison = (expression: ts.BinaryExpression): boolean => {
  const isStrictComparison = isStrictTagComparisonOperator(
    expression.operatorToken.kind
  )

  return isStrictComparison && hasTagComparisonOperands(expression)
}

const isSchemaTagComparison = (node: ts.Node): node is ts.BinaryExpression =>
  ts.isBinaryExpression(node) ? isTagComparison(node) : false

const tagAccessExpression = (
  expression: ts.BinaryExpression
): Option.Option<ts.PropertyAccessExpression> => {
  const leftAccess = tagPropertyAccess(expression.left)
  const rightAccess = tagPropertyAccess(expression.right)
  const accessOptions = [leftAccess, rightAccess]

  return Option.firstSomeOf(accessOptions)
}

const tagLiteralExpression = (
  expression: ts.BinaryExpression
): Option.Option<ts.StringLiteralLike> => {
  const leftLiteral = stringLiteralExpression(expression.left)
  const rightLiteral = stringLiteralExpression(expression.right)
  const literalOptions = [leftLiteral, rightLiteral]

  return Option.firstSomeOf(literalOptions)
}

const checkedValueText =
  (sourceFile: ts.SourceFile) =>
  (access: ts.PropertyAccessExpression): string =>
    access.expression.getText(sourceFile)

const comparedTagText = (expression: ts.BinaryExpression): string =>
  pipe(
    tagLiteralExpression(expression),
    Option.map(Struct.get("text")),
    Option.getOrElse(Function.constant("$tag"))
  )

const checkedExpressionText = (
  expression: ts.BinaryExpression,
  sourceFile: ts.SourceFile
): string =>
  pipe(
    tagAccessExpression(expression),
    Option.map(checkedValueText(sourceFile)),
    Option.getOrElse(Function.constant("the value"))
  )

const schemaIsSuggestion = (
  expression: ts.BinaryExpression,
  valueText: string
): string => {
  const schemaIsCheck = `Schema.is($schema)(${valueText})`
  const isNegated =
    expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken

  return isNegated ? `!${schemaIsCheck}` : schemaIsCheck
}

const schemaIsRuleMatch = (
  context: RuleContext,
  expression: ts.BinaryExpression
): RuleMatch => {
  const sourceFile = context.sourceFile
  const valueText = checkedExpressionText(expression, sourceFile)
  const operatorText = expression.operatorToken.getText(sourceFile)
  const tagText = comparedTagText(expression)
  const suggestion = schemaIsSuggestion(expression, valueText)

  return createRuleMatch(context, {
    ruleId,
    node: expression,
    message: `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
    hint:
      `Replace the tag check with ${suggestion}, using the Effect Schema class for ` +
      `"${tagText}".`
  })
}

const schemaIsMatches = (
  expression: ts.BinaryExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [schemaIsRuleMatch(context, expression)]

const check = onNode(
  [ts.SyntaxKind.BinaryExpression],
  isSchemaTagComparison,
  schemaIsMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `if (shape._tag === "Circle") {
  return circleArea(shape)
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `if (Schema.is(Circle)(shape)) {
  return circleArea(shape)
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectSchemaIs = new Rule({
  id: ruleId,
  description: "Prefer Schema.is over direct _tag comparisons.",
  example,
  check
})
