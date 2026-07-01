import { HashSet, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-inline-boolean-expressions"

const logicalOperatorKinds = HashSet.make(
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken
)

const hasLogicalOperator = (expression: ts.BinaryExpression): boolean =>
  HashSet.has(logicalOperatorKinds, expression.operatorToken.kind)

const inlineBooleanConditionMatches =
  (context: RuleContext) =>
  (ifStatement: ts.IfStatement): ReadonlyArray<RuleMatch> => {
    const expression = unwrapExpression(ifStatement.expression)
    const binaryExpression = Option.liftPredicate(ts.isBinaryExpression)(
      expression
    )
    const isLogicalOperatorExpression = Option.exists(
      binaryExpression,
      hasLogicalOperator
    )

    return isLogicalOperatorExpression
      ? [
          createRuleMatch(context)({
            ruleId,
            node: expression,
            message:
              "Avoid boolean operators inline in an if statement condition.",
            hint:
              "Extract the expression into a well-named const variable declaration above the if " +
              "statement and use that variable in the if condition."
          })
        ]
      : []
  }

const check = onNode([ts.SyntaxKind.IfStatement])(ts.isIfStatement)(
  inlineBooleanConditionMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `declare const user: { readonly isActive: boolean; readonly hasPermission: boolean }
declare const grantAccess: () => Promise<void>

export const ensureAccess = async (): Promise<void> => {
  if (user.isActive && user.hasPermission) {
    await grantAccess()
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `import { Effect } from "effect"

declare const user: { readonly isActive: boolean; readonly hasPermission: boolean }
declare const grantAccess: () => Effect.Effect<void>

export const ensureAccess = Effect.fn(function* () {
  const canAccess = user.isActive && user.hasPermission

  if (canAccess) {
    yield* grantAccess()
  }
})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noInlineBooleanExpressions = new Rule({
  id: ruleId,
  description:
    "Disallow boolean operators inline in an if statement condition.",
  example,
  check
})
