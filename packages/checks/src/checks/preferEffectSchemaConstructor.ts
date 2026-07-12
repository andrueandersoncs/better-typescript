import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { unwrapTransparentExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
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
): ReadonlyArray<ts.Expression> => {
  const values188 = Array.make(conditional.whenTrue, conditional.whenFalse)
  return Array.flatMap(values188, branchExpressions)
}

const branchExpressions = (
  expression: ts.Expression
): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  const value189 = pipe(
    Option.liftPredicate(ts.isConditionalExpression)(unwrapped),
    Option.map(ternaryBranches)
  )

  const value190 = pipe(
    Option.liftPredicate(isShortCircuitExpression)(unwrapped),
    Option.map(Struct.get("right")),
    Option.map(branchExpressions)
  )

  const branches = Array.make(value189, value190)

  const values191 = Array.of(unwrapped)
  return pipe(
    Option.firstSomeOf(branches),
    Option.getOrElse(Function.constant(values191))
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

const tagValueText = (property: ts.PropertyAssignment): Option.Option<string> =>
  pipe(
    unwrapTransparentExpression(property.initializer),
    Option.liftPredicate(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

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

type ReturnCandidate = ts.ReturnStatement | ts.ArrowFunction

const isReturnCandidate = (node: ts.Node): node is ReturnCandidate =>
  ts.isReturnStatement(node) || ts.isArrowFunction(node)

const objectLiteralReturnMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (node: ReturnCandidate): ReadonlyArray<Detection> => {
    const expression = ts.isReturnStatement(node)
      ? Option.fromNullable(node.expression)
      : Option.liftPredicate(ts.isExpression)(node.body)

    const expressions = Option.toArray(expression)
    return Array.flatMap(expressions, (expression) => {
      const objectLiterals = pipe(
        branchExpressions(expression),
        Array.filter(ts.isObjectLiteralExpression),
        Array.filter(hasProperties)
      )

      return Array.map(objectLiterals, (literal) => {
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
      })
    })
  }

  return matches
}

const values192 = Array.make(
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ArrowFunction
)

const check = nodeCheck(values192)(isReturnCandidate)(
  objectLiteralReturnMatches
)

export const preferEffectSchemaConstructor: Check = check

export const preferEffectSchemaConstructorExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-schema-constructor")
