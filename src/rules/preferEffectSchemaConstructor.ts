import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapTransparentExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-constructor"

const tagPropertyName = "_tag"

const shortCircuitOperatorKinds = HashSet.make(
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.AmpersandAmpersandToken
)

const hasShortCircuitOperator = (expression: ts.BinaryExpression): boolean =>
  HashSet.has(shortCircuitOperatorKinds, expression.operatorToken.kind)

const isShortCircuitExpression = (
  expression: ts.Expression
): expression is ts.BinaryExpression => {
  const binaryExpression = Option.liftPredicate(ts.isBinaryExpression)(
    expression
  )

  return Option.exists(binaryExpression, hasShortCircuitOperator)
}

const ternaryBranches = (
  conditional: ts.ConditionalExpression
): ReadonlyArray<ts.Expression> =>
  [conditional.whenTrue, conditional.whenFalse].flatMap(branchExpressions)

const branchExpressions = (
  expression: ts.Expression
): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapTransparentExpression(expression)
  const branches = [
    pipe(
      Option.liftPredicate(ts.isConditionalExpression)(unwrapped),
      Option.map(ternaryBranches)
    ),
    pipe(
      Option.liftPredicate(isShortCircuitExpression)(unwrapped),
      Option.map(Struct.get("right")),
      Option.map(branchExpressions)
    )
  ]

  return pipe(
    Option.firstSomeOf(branches),
    Option.getOrElse(Function.constant([unwrapped]))
  )
}

const hasProperties = (literal: ts.ObjectLiteralExpression): boolean =>
  literal.properties.length > 0

const hasTagText = (identifier: ts.Identifier): boolean =>
  identifier.text === tagPropertyName

const isTagAssignment = (
  property: ts.ObjectLiteralElementLike
): property is ts.PropertyAssignment =>
  ts.isPropertyAssignment(property) &&
  pipe(
    Option.liftPredicate(ts.isIdentifier)(property.name),
    Option.exists(hasTagText)
  )

const tagValueText = (
  property: ts.PropertyAssignment
): Option.Option<string> => {
  const initializer = unwrapTransparentExpression(property.initializer)

  return pipe(
    Option.liftPredicate(ts.isStringLiteralLike)(initializer),
    Option.map(Struct.get("text"))
  )
}

const taggedMessage = (tag: string): string =>
  `Avoid returning a raw "${tag}" object literal.`

const untaggedMessage = "Avoid returning a raw object literal."

const taggedHint = (tag: string): string =>
  `Define an Effect Schema for this data — class ${tag} extends ` +
  `Schema.TaggedClass<${tag}>()("${tag}", { ... }) {} — and construct it through the ` +
  `schema: return new ${tag}({ ... }) fills in _tag and validates every field.`

const untaggedHint =
  "Define an Effect Schema for this data — class TheData extends " +
  'Schema.Class<TheData>("TheData")({ ... }) {} — and construct it through the schema: ' +
  "return new TheData({ ... }) instead of assembling the object by hand."

const objectLiteralRuleMatch =
  (context: RuleContext) =>
  (literal: ts.ObjectLiteralExpression): RuleMatch => {
    const tag = pipe(
      Array.findFirst(literal.properties, isTagAssignment),
      Option.flatMap(tagValueText)
    )
    const message = Option.match(tag, {
      onNone: Function.constant(untaggedMessage),
      onSome: taggedMessage
    })
    const hint = Option.match(tag, {
      onNone: Function.constant(untaggedHint),
      onSome: taggedHint
    })

    return createRuleMatch(context)({ ruleId, node: literal, message, hint })
  }

const expressionRuleMatches =
  (context: RuleContext) =>
  (expression: ts.Expression): ReadonlyArray<RuleMatch> =>
    branchExpressions(expression)
      .filter(ts.isObjectLiteralExpression)
      .filter(hasProperties)
      .map(objectLiteralRuleMatch(context))

const returnStatementMatches =
  (context: RuleContext) =>
  (statement: ts.ReturnStatement): ReadonlyArray<RuleMatch> => {
    const expression = Option.fromNullable(statement.expression)

    return Option.toArray(expression).flatMap(expressionRuleMatches(context))
  }

const arrowBodyReturnMatches =
  (context: RuleContext) =>
  (arrowFunction: ts.ArrowFunction): ReadonlyArray<RuleMatch> => {
    const expression = Option.liftPredicate(ts.isExpression)(arrowFunction.body)

    return Option.toArray(expression).flatMap(expressionRuleMatches(context))
  }

const returnStatementListener = onNode([ts.SyntaxKind.ReturnStatement])(
  ts.isReturnStatement
)(returnStatementMatches)

const arrowBodyListener = onNode([ts.SyntaxKind.ArrowFunction])(
  ts.isArrowFunction
)(arrowBodyReturnMatches)

const check = combineAll([returnStatementListener, arrowBodyListener])

const badExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `export const createUser = (name: string) =>
  ({ _tag: "User" as const, name, createdAt: Date.now() })`
})

const goodExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `import { Schema } from "effect"

class User extends Schema.TaggedClass<User>()("User", {
  name: Schema.String,
  createdAt: Schema.Number
}) {}

export const createUser = (name: string) => {
  const createdAt = Date.now()

  return new User({ name, createdAt })
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectSchemaConstructor = new Rule({
  id: ruleId,
  description:
    "Disallow returning raw object literals in favor of Effect Schema constructors.",
  example,
  check
})
