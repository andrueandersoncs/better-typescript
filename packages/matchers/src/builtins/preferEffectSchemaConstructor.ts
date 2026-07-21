import { Array, Function, HashSet, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { isReturnedExpressionNode, unwrapTransparentExpression } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const optionalTag = Schema.optional(Schema.String)

// PreferEffectSchemaConstructorFact records optional tags because tagged advice differs.
export const PreferEffectSchemaConstructorFact = Schema.Struct({
  tag: optionalTag
})

export interface PreferEffectSchemaConstructorFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaConstructorFact
> {}

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

const hasTagText = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual(tagPropertyName))

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

const objectLiteralReturnMatches = (_context: MatchContext) => {
  const matches = (node: ts.Node) => {
    if (!isReturnedExpressionNode(node)) {
      return Array.empty()
    }

    const expression = ts.isReturnStatement(node)
      ? Option.fromNullishOr(node.expression)
      : Option.liftPredicate(ts.isExpression)((node as ts.ArrowFunction).body)

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
          Option.flatMap(tagValueText),
          Option.getOrUndefined
        )

        const fact = PreferEffectSchemaConstructorFact.make({ tag })
        return makeNodeMatch(literal, fact)
      })
    })
  }

  return matches
}

const returnCandidateKinds = Array.make(ts.SyntaxKind.ReturnStatement, ts.SyntaxKind.ArrowFunction)

export const preferEffectSchemaConstructorMatcher = nodeMatcher(returnCandidateKinds)(
  isReturnedExpressionNode
)(objectLiteralReturnMatches)
