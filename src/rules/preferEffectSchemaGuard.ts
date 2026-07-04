import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { astChildren } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "prefer-effect-schema-guard"

const conditionExpressions = (
  expression: ts.Expression
): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapExpression(expression)

  return pipe(
    astChildren(unwrapped)
      .filter(ts.isExpression)
      .flatMap(conditionExpressions),
    Array.prepend(unwrapped)
  )
}

const binaryExpressionIsStringKeyIn = (
  expression: ts.BinaryExpression
): boolean => {
  const isInOperator = expression.operatorToken.kind === ts.SyntaxKind.InKeyword
  const keyExpression = unwrapExpression(expression.left)
  const hasStringKey =
    ts.isStringLiteral(keyExpression) ||
    ts.isNoSubstitutionTemplateLiteral(keyExpression)

  return isInOperator && hasStringKey
}

const isStringKeyInExpression = (
  expression: ts.Expression
): expression is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(expression),
    Option.exists(binaryExpressionIsStringKeyIn)
  )

const schemaGuardMatch =
  (sourceFile: ts.SourceFile) =>
  (match: CreateMatch) =>
  (expression: ts.BinaryExpression): Finding => {
    const propertyName = unwrapExpression(expression.left).getText(sourceFile)
    const objectText = expression.right.getText(sourceFile)

    return match({
      ruleId,
      node: expression,
      message: `Avoid using ${propertyName} in ${objectText} as a type guard.`,
      hint: `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`
    })
  }

// The context stage runs once per file, so the specialized guard match is shared by every IfStatement the dispatcher feeds to matches.
const inOperatorGuardMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)
  const guardMatch = schemaGuardMatch(context.sourceFile)(match)

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Finding> =>
    conditionExpressions(ifStatement.expression)
      .filter(isStringKeyInExpression)
      .map(guardMatch)

  return matches
}

const check = onNode([ts.SyntaxKind.IfStatement])(ts.isIfStatement)(
  inOperatorGuardMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/guard.ts",
  code: `export const readName = (value: object) => {
  if ("name" in value) {
    return value.name
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/guard.ts",
  code: `import { Schema } from "effect"

class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {}

export const readName = (value: unknown) => {
  if (Schema.is(User)(value)) {
    return value.name
  }
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectSchemaGuard = new Rule({
  id: ruleId,
  description:
    "Prefer Effect Schema guards over string-key in-operator checks.",
  example,
  check
})
