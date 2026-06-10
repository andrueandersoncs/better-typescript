import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "./tsNode.js"
import type { Rule, RuleContext } from "./types.js"

const ruleId = "prefer-conditional-return"
const maximumReturnExpressionLength = 100

interface ConditionalReturnMatch {
  readonly ifStatement: ts.IfStatement
  readonly returnExpression: string
}

export const preferConditionalReturn: Rule = {
  id: ruleId,
  description:
    "Prefer conditional return expressions over if statements that choose between two values.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isBlock),
        Stream.flatMap((block) =>
          Stream.fromIterable(conditionalReturnMatches(context, block))
        ),
        Stream.map((match) =>
          createRuleMatch(context, {
            ruleId,
            node: match.ifStatement,
            message: "Avoid if statements that only choose between two return values.",
            hint: `Return a conditional expression instead: return ${match.returnExpression}.`
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const conditionalReturnMatches = (
  context: RuleContext,
  block: ts.Block
): ReadonlyArray<ConditionalReturnMatch> =>
  block.statements.flatMap((statement, index) => {
    if (!ts.isIfStatement(statement)) {
      return []
    }

    const nextStatement = Option.fromNullable(block.statements[index + 1])

    return Option.match(conditionalReturnMatch(context, statement, nextStatement), {
      onNone: () => [],
      onSome: (match) => [match]
    })
  })

const conditionalReturnMatch = (
  context: RuleContext,
  ifStatement: ts.IfStatement,
  nextStatement: Option.Option<ts.Statement>
): Option.Option<ConditionalReturnMatch> => {
  const sourceFile = context.sourceFile
  const thenExpression = returnExpressionFromStatement(
    sourceFile,
    ifStatement.thenStatement
  )

  return Option.match(thenExpression, {
    onNone: () => Option.none(),
    onSome: (thenExpression) =>
      Option.match(fallbackReturnExpression(sourceFile, ifStatement, nextStatement), {
        onNone: () => Option.none(),
        onSome: (fallbackExpression) =>
          Option.some({
            ifStatement,
            returnExpression: conditionalExpressionText(
              context,
              ifStatement.expression,
              thenExpression,
              fallbackExpression
            )
          })
      })
  })
}

const fallbackReturnExpression = (
  sourceFile: ts.SourceFile,
  ifStatement: ts.IfStatement,
  nextStatement: Option.Option<ts.Statement>
): Option.Option<ts.Expression> =>
  Option.match(Option.fromNullable(ifStatement.elseStatement), {
    onNone: () =>
      Option.flatMap(nextStatement, (statement) =>
        returnExpressionFromStatement(sourceFile, statement)
      ),
    onSome: (statement) => returnExpressionFromStatement(sourceFile, statement)
  })

const returnExpressionFromStatement = (
  sourceFile: ts.SourceFile,
  statement: ts.Statement
): Option.Option<ts.Expression> => {
  const unwrappedStatement = unwrapSingleStatementBlock(statement)

  if (!ts.isReturnStatement(unwrappedStatement)) {
    return Option.none()
  }

  return Option.match(Option.fromNullable(unwrappedStatement.expression), {
    onNone: () => Option.none(),
    onSome: (expression) =>
      isSimpleReturnExpression(sourceFile, expression)
        ? Option.some(expression)
        : Option.none()
  })
}

const isSimpleReturnExpression = (
  sourceFile: ts.SourceFile,
  expression: ts.Expression
): boolean => {
  const text = expression.getText(sourceFile)
  const isSingleLine = !text.includes("\n")
  const isShort = text.length <= maximumReturnExpressionLength
  const hasYieldExpression = containsYieldExpression(expression)

  return [isSingleLine, isShort, !hasYieldExpression].every(Boolean)
}

const containsYieldExpression = (node: ts.Node): boolean =>
  ts.isYieldExpression(node) || containsChildYieldExpression(node)

const containsChildYieldExpression = (node: ts.Node): boolean =>
  ts.forEachChild(node, containsYieldExpression) === true

const conditionalExpressionText = (
  context: RuleContext,
  condition: ts.Expression,
  thenExpression: ts.Expression,
  fallbackExpression: ts.Expression
): string => {
  const sourceFile = context.sourceFile
  const negatedCondition = negatedConditionOperand(unwrapExpression(condition))

  return Option.match(negatedCondition, {
    onNone: () =>
      [
        parenthesizedExpressionText(condition, sourceFile),
        "?",
        thenExpression.getText(sourceFile),
        ":",
        fallbackExpression.getText(sourceFile)
      ].join(" "),
    onSome: (operand) =>
      [
        parenthesizedExpressionText(operand, sourceFile),
        "?",
        fallbackExpression.getText(sourceFile),
        ":",
        thenExpression.getText(sourceFile)
      ].join(" ")
  })
}

const negatedConditionOperand = (
  expression: ts.Expression
): Option.Option<ts.Expression> =>
  Option.match(Option.liftPredicate(ts.isPrefixUnaryExpression)(expression), {
    onNone: () => Option.none(),
    onSome: negatedPrefixUnaryExpressionOperand
  })

const negatedPrefixUnaryExpressionOperand = (
  expression: ts.PrefixUnaryExpression
): Option.Option<ts.Expression> =>
  Option.match(
    Option.liftPredicate(
      (expression: ts.PrefixUnaryExpression) =>
        expression.operator === ts.SyntaxKind.ExclamationToken
    )(expression),
    {
      onNone: () => Option.none(),
      onSome: (expression) => Option.some(expression.operand)
    }
  )

const parenthesizedExpressionText = (
  expression: ts.Expression,
  sourceFile: ts.SourceFile
): string => `(${expression.getText(sourceFile)})`
