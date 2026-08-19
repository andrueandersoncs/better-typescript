import { Array, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { astChildren } from "../sources/astChildren.js"
import { strictEqual } from "../equivalence.js"

// PreferEffectSchemaGuardFact exists because its fields form one stable data contract used by the linter.
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
  const matches = (ifStatement: ts.IfStatement) =>
    pipe(
      conditionExpressions(ifStatement.expression),
      Array.filter(isStringKeyInExpression),
      Array.map((expression) => {
        const propertyName = unwrapExpression(expression.left).getText(context.sourceFile)
        const objectText = expression.right.getText(context.sourceFile)
        const fact = PreferEffectSchemaGuardFact.make({ propertyName, objectText })

        return makeNodeMatch(expression, fact)
      })
    )

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

export const preferEffectSchemaGuardScanner = makeNodeScanner(ifStatementKinds)(ts.isIfStatement)(
  inOperatorGuardMatches
)
