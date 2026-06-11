import { Array, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-conditional-return"
const maximumReturnExpressionLength = 100

const containsYieldExpression = (node: ts.Node): boolean =>
  ts.isYieldExpression(node) || containsChildYieldExpression(node)

const containsChildYieldExpression = (node: ts.Node): boolean =>
  ts.forEachChild(node, containsYieldExpression) === true

const isSimpleReturnExpression =
  (sourceFile: ts.SourceFile) =>
  (expression: ts.Expression): boolean => {
    const text = expression.getText(sourceFile)
    const isSingleLine = !text.includes("\n")
    const isShort = text.length <= maximumReturnExpressionLength
    const hasYieldExpression = containsYieldExpression(expression)

    return [isSingleLine, isShort, !hasYieldExpression].every(Boolean)
  }

const returnExpressionFromStatement =
  (sourceFile: ts.SourceFile) =>
  (statement: ts.Statement): Option.Option<ts.Expression> =>
    Option.gen(function* () {
      const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
        unwrapSingleStatementBlock(statement)
      )
      const expression = yield* Option.fromNullable(returnStatement.expression)

      return yield* Option.liftPredicate(isSimpleReturnExpression(sourceFile))(expression)
    })

const fallbackReturnExpression = (
  sourceFile: ts.SourceFile,
  ifStatement: ts.IfStatement,
  nextStatement: Option.Option<ts.Statement>
): Option.Option<ts.Expression> => {
  const elseStatement = Option.fromNullable(ifStatement.elseStatement)
  const fallbackStatement = Option.isSome(elseStatement) ? elseStatement : nextStatement

  return Option.flatMap(fallbackStatement, returnExpressionFromStatement(sourceFile))
}

const negatedPrefixUnaryExpressionOperand = (
  expression: ts.PrefixUnaryExpression
): Option.Option<ts.Expression> => {
  const isNegation = expression.operator === ts.SyntaxKind.ExclamationToken

  return isNegation ? Option.some(expression.operand) : Option.none()
}

const negatedConditionOperand = (expression: ts.Expression): Option.Option<ts.Expression> =>
  Option.flatMap(
    Option.liftPredicate(ts.isPrefixUnaryExpression)(expression),
    negatedPrefixUnaryExpressionOperand
  )

const parenthesizedExpressionText = (
  expression: ts.Expression,
  sourceFile: ts.SourceFile
): string => `(${expression.getText(sourceFile)})`

const ternaryText = (
  sourceFile: ts.SourceFile,
  condition: ts.Expression,
  whenTrue: ts.Expression,
  whenFalse: ts.Expression
): string =>
  [
    parenthesizedExpressionText(condition, sourceFile),
    "?",
    whenTrue.getText(sourceFile),
    ":",
    whenFalse.getText(sourceFile)
  ].join(" ")

const conditionalExpressionText = (
  context: RuleContext,
  condition: ts.Expression,
  thenExpression: ts.Expression,
  fallbackExpression: ts.Expression
): string => {
  const sourceFile = context.sourceFile
  const negatedCondition = negatedConditionOperand(unwrapExpression(condition))

  return Option.isSome(negatedCondition)
    ? ternaryText(sourceFile, negatedCondition.value, fallbackExpression, thenExpression)
    : ternaryText(sourceFile, condition, thenExpression, fallbackExpression)
}

const conditionalReturnMatch =
  (context: RuleContext, nextStatement: Option.Option<ts.Statement>) =>
  (ifStatement: ts.IfStatement): Option.Option<RuleMatch> =>
    Option.gen(function* () {
      const thenExpression = yield* returnExpressionFromStatement(context.sourceFile)(
        ifStatement.thenStatement
      )
      const fallbackExpression = yield* fallbackReturnExpression(
        context.sourceFile,
        ifStatement,
        nextStatement
      )
      const returnExpression = conditionalExpressionText(
        context,
        ifStatement.expression,
        thenExpression,
        fallbackExpression
      )

      return createRuleMatch(context, {
        ruleId,
        node: ifStatement,
        message: "Avoid if statements that only choose between two return values.",
        hint: `Return a conditional expression instead: return ${returnExpression}.`
      })
    })

const statementConditionalMatch =
  (context: RuleContext, block: ts.Block) =>
  (statement: ts.Statement, index: number): Option.Option<RuleMatch> =>
    Option.flatMap(
      Option.liftPredicate(ts.isIfStatement)(statement),
      conditionalReturnMatch(context, Option.fromNullable(block.statements[index + 1]))
    )

const conditionalReturnRuleMatches = (
  block: ts.Block,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Array.filterMap(block.statements, statementConditionalMatch(context, block))

export const preferConditionalReturn = new Rule({
  id: ruleId,
  description:
    "Prefer conditional return expressions over if statements that choose between two values.",
  check: onNode([ts.SyntaxKind.Block], ts.isBlock, conditionalReturnRuleMatches)
})
