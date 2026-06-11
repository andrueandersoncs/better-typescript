import { Match, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "./tsNode.js"
import type { Rule, RuleContext } from "./types.js"

const ruleId = "prefer-direct-boolean-return"

interface BooleanReturn {
  readonly value: boolean
}

interface DirectBooleanReturnMatch {
  readonly ifStatement: ts.IfStatement
  readonly literalValue: boolean
  readonly returnExpression: string
}

export const preferDirectBooleanReturn: Rule = {
  id: ruleId,
  description: "Prefer returning boolean expressions directly instead of conditional boolean literals.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, (ifStatement, context) =>
    Option.match(directBooleanReturnMatch(context, ifStatement), {
      onNone: () => [],
      onSome: (match) => [
        createRuleMatch(context, {
          ruleId,
          node: match.ifStatement,
          message: `Avoid returning ${String(match.literalValue)} from a conditional branch.`,
          hint: `Use the condition as the boolean value instead: return ${match.returnExpression}.`
        })
      ]
    })
  )
}

const directBooleanReturnMatch = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<DirectBooleanReturnMatch> => {
  const thenReturn = booleanReturnFromStatement(ifStatement.thenStatement)

  return Option.match(thenReturn, {
    onNone: () => Option.none(),
    onSome: (thenReturn) => {
      const conditionText = ifStatement.expression.getText(context.sourceFile)

      return Option.some({
        ifStatement,
        literalValue: thenReturn.value,
        returnExpression: thenReturn.value ? `(${conditionText})` : `!(${conditionText})`
      })
    }
  })
}

const booleanReturnFromStatement = (
  statement: ts.Statement
): Option.Option<BooleanReturn> => {
  const returnStatement = unwrapSingleStatementBlock(statement)

  if (!ts.isReturnStatement(returnStatement)) {
    return Option.none()
  }

  return Option.match(Option.fromNullable(returnStatement.expression), {
    onNone: () => Option.none(),
    onSome: (expression) =>
      Option.match(booleanLiteralValue(expression), {
        onNone: () => Option.none(),
        onSome: (value) => Option.some({ value })
      })
  })
}

const booleanLiteralValue = (expression: ts.Expression): Option.Option<boolean> => {
  const unwrapped = unwrapExpression(expression)

  return Match.value(unwrapped.kind).pipe(
    Match.when(ts.SyntaxKind.TrueKeyword, () => true),
    Match.when(ts.SyntaxKind.FalseKeyword, () => false),
    Match.option
  )
}
