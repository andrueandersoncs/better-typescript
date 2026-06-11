import { Array, Function, Option } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapTransparentExpression } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-constructor"

const tagPropertyName = "_tag"

// `condition ? value : { ... }` and `fallback ?? { ... }` still return a raw literal
// on one path, so conditional branches and short-circuit right operands count as
// return positions too.
const shortCircuitOperatorKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.AmpersandAmpersandToken
])

const hasShortCircuitOperator = (expression: ts.BinaryExpression): boolean =>
  shortCircuitOperatorKinds.has(expression.operatorToken.kind)

const isShortCircuitExpression = (
  expression: ts.Expression
): expression is ts.BinaryExpression => {
  const binaryExpression = Option.liftPredicate(ts.isBinaryExpression)(expression)

  return Option.exists(binaryExpression, hasShortCircuitOperator)
}

const rightOperand = (expression: ts.BinaryExpression): ts.Expression => expression.right

const ternaryBranches = (conditional: ts.ConditionalExpression): ReadonlyArray<ts.Expression> =>
  [conditional.whenTrue, conditional.whenFalse].flatMap(branchExpressions)

const conditionalBranches = (
  expression: ts.Expression
): Option.Option<ReadonlyArray<ts.Expression>> =>
  Option.liftPredicate(ts.isConditionalExpression)(expression).pipe(Option.map(ternaryBranches))

const shortCircuitBranches = (
  expression: ts.Expression
): Option.Option<ReadonlyArray<ts.Expression>> =>
  Option.liftPredicate(isShortCircuitExpression)(expression).pipe(
    Option.map(rightOperand),
    Option.map(branchExpressions)
  )

const branchExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapTransparentExpression(expression)
  const branches = [conditionalBranches(unwrapped), shortCircuitBranches(unwrapped)]

  return Option.firstSomeOf(branches).pipe(Option.getOrElse(Function.constant([unwrapped])))
}

// Empty literals carry no data to define a schema for, so only literals with at
// least one property are reported.
const hasProperties = (literal: ts.ObjectLiteralExpression): boolean =>
  literal.properties.length > 0

const returnedObjectLiterals = (
  expression: ts.Expression
): ReadonlyArray<ts.ObjectLiteralExpression> =>
  branchExpressions(expression).filter(ts.isObjectLiteralExpression).filter(hasProperties)

const hasTagText = (identifier: ts.Identifier): boolean => identifier.text === tagPropertyName

const isTagPropertyName = (name: ts.PropertyName): boolean => {
  const identifier = Option.liftPredicate(ts.isIdentifier)(name)

  return Option.exists(identifier, hasTagText)
}

const isTagAssignment = (
  property: ts.ObjectLiteralElementLike
): property is ts.PropertyAssignment =>
  ts.isPropertyAssignment(property) && isTagPropertyName(property.name)

const stringLiteralText = (literal: ts.StringLiteralLike): string => literal.text

const tagValueText = (property: ts.PropertyAssignment): Option.Option<string> => {
  const initializer = unwrapTransparentExpression(property.initializer)

  return Option.liftPredicate(ts.isStringLiteralLike)(initializer).pipe(
    Option.map(stringLiteralText)
  )
}

const literalTag = (literal: ts.ObjectLiteralExpression): Option.Option<string> =>
  Array.findFirst(literal.properties, isTagAssignment).pipe(Option.flatMap(tagValueText))

const taggedMessage = (tag: string): string => `Avoid returning a raw "${tag}" object literal.`

const untaggedMessage = "Avoid returning a raw object literal."

const matchMessage = (tag: Option.Option<string>): string =>
  Option.match(tag, { onNone: Function.constant(untaggedMessage), onSome: taggedMessage })

const taggedHint = (tag: string): string =>
  `Define an Effect Schema for this data — class ${tag} extends ` +
  `Schema.TaggedClass<${tag}>()("${tag}", { ... }) {} — and construct it through the ` +
  `schema: return new ${tag}({ ... }) fills in _tag and validates every field.`

const untaggedHint =
  "Define an Effect Schema for this data — class TheData extends " +
  'Schema.Class<TheData>("TheData")({ ... }) {} — and construct it through the schema: ' +
  "return new TheData({ ... }) instead of assembling the object by hand."

const matchHint = (tag: Option.Option<string>): string =>
  Option.match(tag, { onNone: Function.constant(untaggedHint), onSome: taggedHint })

const objectLiteralRuleMatch =
  (context: RuleContext) =>
  (literal: ts.ObjectLiteralExpression): RuleMatch => {
    const tag = literalTag(literal)
    const message = matchMessage(tag)
    const hint = matchHint(tag)

    return createRuleMatch(context, {
      ruleId,
      node: literal,
      message,
      hint
    })
  }

const expressionRuleMatches =
  (context: RuleContext) =>
  (expression: ts.Expression): ReadonlyArray<RuleMatch> =>
    returnedObjectLiterals(expression).map(objectLiteralRuleMatch(context))

const returnStatementMatches = (
  statement: ts.ReturnStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const expression = Option.fromNullable(statement.expression)

  return Option.toArray(expression).flatMap(expressionRuleMatches(context))
}

const implicitReturnExpression = (arrowFunction: ts.ArrowFunction): Option.Option<ts.Expression> =>
  Option.liftPredicate(ts.isExpression)(arrowFunction.body)

const arrowBodyReturnMatches = (
  arrowFunction: ts.ArrowFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const expression = implicitReturnExpression(arrowFunction)

  return Option.toArray(expression).flatMap(expressionRuleMatches(context))
}

const returnStatementListener = onNode(
  [ts.SyntaxKind.ReturnStatement],
  ts.isReturnStatement,
  returnStatementMatches
)

const arrowBodyListener = onNode(
  [ts.SyntaxKind.ArrowFunction],
  ts.isArrowFunction,
  arrowBodyReturnMatches
)

const check = combineAll([returnStatementListener, arrowBodyListener])

export const preferEffectSchemaConstructor = new Rule({
  id: ruleId,
  description: "Disallow returning raw object literals in favor of Effect Schema constructors.",
  check
})
