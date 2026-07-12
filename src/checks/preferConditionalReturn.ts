import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import {
  unwrapExpression,
  unwrapSingleStatementBlock
} from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

const maximumReturnExpressionLength = 100

const containsYieldExpression = (node: ts.Node): boolean => {
  const isYield = ts.isYieldExpression(node)
  const childContainsYield =
    ts.forEachChild(node, containsYieldExpression) === true

  return isYield || childContainsYield
}

// Leave branches that return ternaries alone because collapsing them would create a nested ternary that another rule forbids.
const isSimpleReturnExpression =
  (sourceFile: ts.SourceFile) =>
  (expression: ts.Expression): boolean => {
    const text = expression.getText(sourceFile)
    const isSingleLine = !text.includes("\n")
    const isShort = text.length <= maximumReturnExpressionLength
    const hasYieldExpression = containsYieldExpression(expression)
    const unwrapped = unwrapExpression(expression)
    const isTernary = ts.isConditionalExpression(unwrapped)

    return [isSingleLine, isShort, !hasYieldExpression, !isTernary].every(
      Boolean
    )
  }

const returnExpressionFromStatement =
  (sourceFile: ts.SourceFile) =>
  (statement: ts.Statement): Option.Option<ts.Expression> =>
    Option.gen(function* () {
      const unwrappedStatement = unwrapSingleStatementBlock(statement)
      const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
        unwrappedStatement
      )
      const expression = yield* Option.fromNullable(returnStatement.expression)

      return yield* Option.liftPredicate(isSimpleReturnExpression(sourceFile))(
        expression
      )
    })

type StatementConditionalMatch = (
  statement: ts.Statement,
  index: number
) => Option.Option<Detection>

const negatedPrefixUnaryExpressionOperand = (
  expression: ts.PrefixUnaryExpression
): Option.Option<ts.Expression> => {
  const isNegation = expression.operator === ts.SyntaxKind.ExclamationToken

  return isNegation ? Option.some(expression.operand) : Option.none()
}

const ternaryText =
  (sourceFile: ts.SourceFile) =>
  (condition: ts.Expression) =>
  (whenTrue: ts.Expression) =>
  (whenFalse: ts.Expression): string =>
    [
      `(${condition.getText(sourceFile)})`,
      "?",
      whenTrue.getText(sourceFile),
      ":",
      whenFalse.getText(sourceFile)
    ].join(" ")

const flippedTernaryText =
  (sourceFile: ts.SourceFile) =>
  (fallbackExpression: ts.Expression) =>
  (thenExpression: ts.Expression) =>
  (operand: ts.Expression): string =>
    ternaryText(sourceFile)(operand)(fallbackExpression)(thenExpression)

const standardTernaryText =
  (sourceFile: ts.SourceFile) =>
  (condition: ts.Expression) =>
  (thenExpression: ts.Expression) =>
  (fallbackExpression: ts.Expression) =>
  (): string =>
    ternaryText(sourceFile)(condition)(thenExpression)(fallbackExpression)

type ReturnExpression = (
  statement: ts.Statement
) => Option.Option<ts.Expression>
type StandardTernary = (
  condition: ts.Expression
) => (
  thenExpression: ts.Expression
) => (fallbackExpression: ts.Expression) => () => string
type FlippedTernary = (
  fallbackExpression: ts.Expression
) => (thenExpression: ts.Expression) => (operand: ts.Expression) => string

const conditionalReturnMatch =
  (returnExpression: ReturnExpression) =>
  (standardTernary: StandardTernary) =>
  (flippedTernary: FlippedTernary) =>
  (match: MakeDetection) =>
  (nextStatement: Option.Option<ts.Statement>) =>
  (ifStatement: ts.IfStatement): Option.Option<Detection> =>
    Option.gen(function* () {
      const thenExpression = yield* returnExpression(ifStatement.thenStatement)
      const elseStatement = Option.fromNullable(ifStatement.elseStatement)
      const fallbackStatement = Option.isSome(elseStatement)
        ? elseStatement
        : nextStatement
      const fallbackExpression = yield* Option.flatMap(
        fallbackStatement,
        returnExpression
      )
      const unwrappedCondition = unwrapExpression(ifStatement.expression)
      const negatedCondition = pipe(
        Option.liftPredicate(ts.isPrefixUnaryExpression)(unwrappedCondition),
        Option.flatMap(negatedPrefixUnaryExpressionOperand)
      )
      const returnText = Option.match(negatedCondition, {
        onNone: standardTernary(ifStatement.expression)(thenExpression)(
          fallbackExpression
        ),
        onSome: flippedTernary(fallbackExpression)(thenExpression)
      })

      return match({
        node: ifStatement,
        message:
          "Avoid if statements that only choose between two return values.",
        hint: `Return a conditional expression instead: return ${returnText}.`
      })
    })

type IfConditionalMatch = (
  nextStatement: Option.Option<ts.Statement>
) => (ifStatement: ts.IfStatement) => Option.Option<Detection>

const statementConditionalMatch =
  (ifMatch: IfConditionalMatch) =>
  (block: ts.Block): StatementConditionalMatch =>
  (statement, index) => {
    const nextStatement = Option.fromNullable(block.statements[index + 1])

    return pipe(
      Option.liftPredicate(ts.isIfStatement)(statement),
      Option.flatMap(ifMatch(nextStatement))
    )
  }

const conditionalReturnDetections = (context: CheckContext) => {
  const returnExpression = returnExpressionFromStatement(context.sourceFile)
  const standardTernary = standardTernaryText(context.sourceFile)
  const flippedTernary = flippedTernaryText(context.sourceFile)
  const match = detection(context)
  const ifMatch =
    conditionalReturnMatch(returnExpression)(standardTernary)(flippedTernary)(
      match
    )
  const conditionalMatch = statementConditionalMatch(ifMatch)

  const matches = (block: ts.Block): ReadonlyArray<Detection> =>
    Array.filterMap(block.statements, conditionalMatch(block))

  return matches
}

const check = nodeCheck([ts.SyntaxKind.Block])(ts.isBlock)(
  conditionalReturnDetections
)

export const preferConditionalReturn: Check = check
