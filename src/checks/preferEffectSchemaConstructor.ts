import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { unwrapTransparentExpression } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

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

const objectLiteralDetection =
  (match: MakeDetection) =>
  (literal: ts.ObjectLiteralExpression): Detection => {
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

    return match({ node: literal, message, hint })
  }

const expressionDetections =
  (match: MakeDetection) =>
  (expression: ts.Expression): ReadonlyArray<Detection> =>
    branchExpressions(expression)
      .filter(ts.isObjectLiteralExpression)
      .filter(hasProperties)
      .map(objectLiteralDetection(match))

type ReturnCandidate = ts.ReturnStatement | ts.ArrowFunction

const isReturnCandidate = (node: ts.Node): node is ReturnCandidate =>
  ts.isReturnStatement(node) || ts.isArrowFunction(node)

// The context stage runs once per file, so both partials below are shared by every ReturnStatement and ArrowFunction the report wiring feeds to matches.
const objectLiteralReturnMatches = (context: CheckContext) => {
  const match = detection(context)
  const expressionMatches = expressionDetections(match)

  const matches = (node: ReturnCandidate): ReadonlyArray<Detection> => {
    const expression = ts.isReturnStatement(node)
      ? Option.fromNullable(node.expression)
      : Option.liftPredicate(ts.isExpression)(node.body)

    return Option.toArray(expression).flatMap(expressionMatches)
  }

  return matches
}

const check = nodeCheck([
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ArrowFunction
])(isReturnCandidate)(objectLiteralReturnMatches)

export const preferEffectSchemaConstructor: Check = check
