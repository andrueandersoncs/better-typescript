import { Array, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { unwrapExpression } from "../support/tsNode.js"
import { astChildren } from "../sources/sources.js"
import { strictEqual } from "../equivalence.js"

// PreferEffectSchemaGuardFact records guard site text because guidance quotes property access.
export const PreferEffectSchemaGuardFact = Schema.Struct({
  propertyName: Schema.String,
  objectText: Schema.String
})

export interface PreferEffectSchemaGuardFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaGuardFact
> {}

const conditionExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapExpression(expression)
  const children = astChildren(unwrapped)
  const filtered = Array.filter(children, ts.isExpression)

  return pipe(Array.flatMap(filtered, conditionExpressions), Array.prepend(unwrapped))
}

const binaryExpressionIsStringKeyIn = (expression: ts.BinaryExpression) => {
  const isInOperator = strictEqual(ts.SyntaxKind.InKeyword)(expression.operatorToken.kind)
  const keyExpression = unwrapExpression(expression.left)

  const hasStringKey =
    ts.isStringLiteral(keyExpression) || ts.isNoSubstitutionTemplateLiteral(keyExpression)

  return isInOperator && hasStringKey
}

const isStringKeyInExpression = (expression: ts.Expression): expression is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(expression),
    Option.exists(binaryExpressionIsStringKeyIn)
  )

const inOperatorGuardMatches = (context: MatchContext) => {
  const sourceFile = context.sourceFile

  const matches = (ifStatement: ts.IfStatement) =>
    pipe(
      conditionExpressions(ifStatement.expression),
      Array.filter(isStringKeyInExpression),
      Array.map((expression) => {
        const propertyName = unwrapExpression(expression.left).getText(sourceFile)
        const objectText = expression.right.getText(sourceFile)
        const fact = PreferEffectSchemaGuardFact.make({ propertyName, objectText })

        return makeNodeMatch(expression, fact)
      })
    )

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

export const preferEffectSchemaGuardMatcher = nodeMatcher(ifStatementKinds)(ts.isIfStatement)(
  inOperatorGuardMatches
)
