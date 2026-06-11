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

const isShortCircuitExpression = (expression: ts.Expression): expression is ts.BinaryExpression =>
  Option.exists(Option.liftPredicate(ts.isBinaryExpression)(expression), hasShortCircuitOperator)

const rightOperand = (expression: ts.BinaryExpression): ts.Expression => expression.right

const ternaryBranches = (conditional: ts.ConditionalExpression): ReadonlyArray<ts.Expression> =>
  [conditional.whenTrue, conditional.whenFalse].flatMap(branchExpressions)

const conditionalBranches = (
  expression: ts.Expression
): Option.Option<ReadonlyArray<ts.Expression>> =>
  Option.map(Option.liftPredicate(ts.isConditionalExpression)(expression), ternaryBranches)

const shortCircuitBranches = (
  expression: ts.Expression
): Option.Option<ReadonlyArray<ts.Expression>> =>
  Option.liftPredicate(isShortCircuitExpression)(expression).pipe(
    Option.map(rightOperand),
    Option.map(branchExpressions)
  )

const branchExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  return Option.firstSomeOf([
    conditionalBranches(unwrapped),
    shortCircuitBranches(unwrapped)
  ]).pipe(Option.getOrElse(Function.constant([unwrapped])))
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

const isTagPropertyName = (name: ts.PropertyName): boolean =>
  Option.exists(Option.liftPredicate(ts.isIdentifier)(name), hasTagText)

const isTagAssignment = (
  property: ts.ObjectLiteralElementLike
): property is ts.PropertyAssignment =>
  ts.isPropertyAssignment(property) && isTagPropertyName(property.name)

const stringLiteralText = (literal: ts.StringLiteralLike): string => literal.text

const tagValueText = (property: ts.PropertyAssignment): Option.Option<string> =>
  Option.map(
    Option.liftPredicate(ts.isStringLiteralLike)(unwrapTransparentExpression(property.initializer)),
    stringLiteralText
  )

const literalTag = (literal: ts.ObjectLiteralExpression): Option.Option<string> =>
  Option.flatMap(Array.findFirst(literal.properties, isTagAssignment), tagValueText)

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

    return createRuleMatch(context, {
      ruleId,
      node: literal,
      message: matchMessage(tag),
      hint: matchHint(tag)
    })
  }

const expressionRuleMatches =
  (context: RuleContext) =>
  (expression: ts.Expression): ReadonlyArray<RuleMatch> =>
    returnedObjectLiterals(expression).map(objectLiteralRuleMatch(context))

const returnStatementMatches = (
  statement: ts.ReturnStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.toArray(Option.fromNullable(statement.expression)).flatMap(expressionRuleMatches(context))

const implicitReturnExpression = (arrowFunction: ts.ArrowFunction): Option.Option<ts.Expression> =>
  Option.liftPredicate(ts.isExpression)(arrowFunction.body)

const arrowBodyReturnMatches = (
  arrowFunction: ts.ArrowFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.toArray(implicitReturnExpression(arrowFunction)).flatMap(expressionRuleMatches(context))

export const preferEffectSchemaConstructor = new Rule({
  id: ruleId,
  description: "Disallow returning raw object literals in favor of Effect Schema constructors.",
  check: combineAll([
    onNode([ts.SyntaxKind.ReturnStatement], ts.isReturnStatement, returnStatementMatches),
    onNode([ts.SyntaxKind.ArrowFunction], ts.isArrowFunction, arrowBodyReturnMatches)
  ])
})
