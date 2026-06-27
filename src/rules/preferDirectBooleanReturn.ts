import { Function, Match, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-direct-boolean-return"

const booleanLiteralValue = (expression: ts.Expression): Option.Option<boolean> => {
  const unwrapped = unwrapExpression(expression)

  return Match.value(unwrapped.kind).pipe(
    Match.when(ts.SyntaxKind.TrueKeyword, Function.constTrue),
    Match.when(ts.SyntaxKind.FalseKeyword, Function.constFalse),
    Match.option
  )
}

const booleanReturnFromStatement = (statement: ts.Statement): Option.Option<boolean> =>
  Option.gen(function* () {
    const unwrappedStatement = unwrapSingleStatementBlock(statement)
    const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(unwrappedStatement)
    const expression = yield* Option.fromNullable(returnStatement.expression)

    return yield* booleanLiteralValue(expression)
  })

const directBooleanRuleMatch =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (literalValue: boolean): RuleMatch => {
    const conditionText = ifStatement.expression.getText(context.sourceFile)
    const returnExpression = literalValue ? `(${conditionText})` : `!(${conditionText})`
    const literalText = String(literalValue)

    return createRuleMatch(context, {ruleId,
    node: ifStatement,
    message: `Avoid returning ${literalText} from a conditional branch.`,
    hint: `Use the condition as the boolean value instead: return ${returnExpression}.`})
  }

const directBooleanMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  booleanReturnFromStatement(ifStatement.thenStatement).pipe(
    Option.map(directBooleanRuleMatch(context, ifStatement)),
    Option.toArray
  )

const check = onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, directBooleanMatches)

const badExample = new ExampleSnippet({
  filePath: "src/age.ts",
  code: `if (age >= 18) {
  return true
}
return false`
})

const goodExample = new ExampleSnippet({
  filePath: "src/age.ts",
  code: `return age >= 18`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferDirectBooleanReturn = new Rule({
  id: ruleId,
  description:
    "Prefer returning boolean expressions directly instead of conditional boolean literals.",
  example,
  check
})
