import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "./support/tsNode.js"
import { isReturnedExpressionNode } from "./support/tsNode.js"
import { defineCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { detection } from "@better-typescript/core/engine/check"
const tagPropertyName = "_tag"

const shortCircuitOperatorKinds = HashSet.make(
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.AmpersandAmpersandToken
)

const hasShortCircuitOperator = (expression: ts.BinaryExpression) =>
  HashSet.has(shortCircuitOperatorKinds, expression.operatorToken.kind)

const isShortCircuitExpression = (expression: ts.Expression): expression is ts.BinaryExpression => {
  const binaryExpression = Option.liftPredicate(ts.isBinaryExpression)(expression)

  return Option.exists(binaryExpression, hasShortCircuitOperator)
}

const ternaryBranches = (conditional: ts.ConditionalExpression): ReadonlyArray<ts.Expression> => {
  const ternaryArms = Array.make(conditional.whenTrue, conditional.whenFalse)
  return Array.flatMap(ternaryArms, branchExpressions)
}

const branchExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  const ternaryBranchOption = pipe(
    Option.liftPredicate(ts.isConditionalExpression)(unwrapped),
    Option.map(ternaryBranches)
  )

  const shortCircuitBranchOption = pipe(
    Option.liftPredicate(isShortCircuitExpression)(unwrapped),
    Option.map(Struct.get("right")),
    Option.map(branchExpressions)
  )

  const branches = Array.make(ternaryBranchOption, shortCircuitBranchOption)
  const leafBranches = Array.of(unwrapped)
  return pipe(Option.firstSomeOf(branches), Option.getOrElse(Function.constant(leafBranches)))
}

const hasProperties = (literal: ts.ObjectLiteralExpression) => literal.properties.length > 0

const hasTagText = (identifier: ts.Identifier) => identifier.text === tagPropertyName

const isTagAssignment = (
  property: ts.ObjectLiteralElementLike
): property is ts.PropertyAssignment =>
  ts.isPropertyAssignment(property) &&
  pipe(Option.liftPredicate(ts.isIdentifier)(property.name), Option.exists(hasTagText))

const tagValueText = (property: ts.PropertyAssignment) =>
  pipe(
    unwrapTransparentExpression(property.initializer),
    Option.liftPredicate(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

const taggedMessage = (tag: string) => `Avoid returning a raw "${tag}" object literal.`

const untaggedMessage = "Avoid returning a raw object literal."

const taggedHint = (tag: string) =>
  `Reuse the existing Effect Schema for the "${tag}" protocol variant and construct it ` +
  `through that schema. If no such model exists, first decide whether "${tag}" is an ` +
  "independent protocol concept or this function is only a procedural seam. Introduce a " +
  `Schema.TaggedClass only when the tagged data has semantics beyond this return expression.`

const untaggedHint =
  "Reuse an existing Effect Schema whose semantics match this result and construct it through " +
  "that schema. If none exists, reconsider whether this function is a real abstraction or a " +
  "procedural seam that should be collapsed into its owner. Introduce a Schema.Class only " +
  "when the returned data has meaning independent of this object literal."

const objectLiteralReturnMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    if (!isReturnedExpressionNode(node)) {
      return Array.empty()
    }

    const expression = ts.isReturnStatement(node)
      ? Option.fromNullishOr(node.expression)
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

const returnCandidateKinds = Array.make(ts.SyntaxKind.ReturnStatement, ts.SyntaxKind.ArrowFunction)

export const preferEffectSchemaConstructor = defineCheck(
  "prefer-effect-schema-constructor",
  returnCandidateKinds,
  isReturnedExpressionNode,
  objectLiteralReturnMatches
)
