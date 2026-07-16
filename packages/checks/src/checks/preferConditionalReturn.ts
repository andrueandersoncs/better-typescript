import { Array, Option, pipe, Result, Function } from "effect"
import * as ts from "typescript"
import { unwrapExpression, unwrapSingleStatementBlock } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { detection } from "@better-typescript/core/engine/check"
import { defineCheck } from "../defineCheck.js"
const maximumReturnExpressionLength = 100

const containsYieldExpression = (node: ts.Node): boolean => {
  const isYield = ts.isYieldExpression(node)
  const childContainsYield = ts.forEachChild(node, containsYieldExpression) === true

  return isYield || childContainsYield
}

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
  (whenFalse: ts.Expression): string => {
    const conditionText = condition.getText(sourceFile)
    const whenTrueText = whenTrue.getText(sourceFile)
    const whenFalseText = whenFalse.getText(sourceFile)
    const ternaryParts = Array.make(`(${conditionText})`, "?", whenTrueText, ":", whenFalseText)

    return Array.join(ternaryParts, " ")
  }

const conditionalReturnDetections = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const match = detection(context)

  // Leave branches that return ternaries alone because collapsing them would create a nested ternary that another rule forbids.
  const returnExpression = (statement: ts.Statement): Option.Option<ts.Expression> =>
    Option.gen(function* () {
      const unwrappedStatement = unwrapSingleStatementBlock(statement)
      const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(unwrappedStatement)
      const expression = yield* Option.fromNullishOr(returnStatement.expression)

      return yield* Option.liftPredicate((expression: ts.Expression) => {
        const text = expression.getText(sourceFile)
        const isSingleLine = !text.includes("\n")
        const isShort = text.length <= maximumReturnExpressionLength
        const hasYieldExpression = containsYieldExpression(expression)
        const unwrapped = unwrapExpression(expression)
        const isTernary = ts.isConditionalExpression(unwrapped)

        const eligibleExpressionConditions = Array.make(
          isSingleLine,
          isShort,
          !hasYieldExpression,
          !isTernary
        )

        return Array.every(eligibleExpressionConditions, Boolean)
      })(expression)
    })

  const matches = (block: ts.Block): ReadonlyArray<Detection> =>
    Array.filterMap(block.statements, (statement, index) => {
      const nextStatement = Option.fromNullishOr(block.statements[index + 1])

      return pipe(
        Option.liftPredicate(ts.isIfStatement)(statement),
        Option.flatMap((ifStatement) =>
          Option.gen(function* () {
            const thenExpression = yield* returnExpression(ifStatement.thenStatement)
            const elseStatement = Option.fromNullishOr(ifStatement.elseStatement)
            const fallbackStatement = Option.isSome(elseStatement) ? elseStatement : nextStatement
            const fallbackExpression = yield* Option.flatMap(fallbackStatement, returnExpression)
            const unwrappedCondition = unwrapExpression(ifStatement.expression)

            const negatedCondition = pipe(
              Option.liftPredicate(ts.isPrefixUnaryExpression)(unwrappedCondition),
              Option.flatMap(negatedPrefixUnaryExpressionOperand)
            )

            const returnText = Option.match(negatedCondition, {
              onNone: () =>
                ternaryText(sourceFile)(ifStatement.expression)(thenExpression)(fallbackExpression),
              onSome: (operand) =>
                ternaryText(sourceFile)(operand)(fallbackExpression)(thenExpression)
            })

            return match({
              node: ifStatement,
              message: "Avoid if statements that only choose between two return values.",
              hint: `Return a conditional expression instead: return ${returnText}.`
            })
          })
        ),
        Result.fromOption(Function.constVoid)
      )
    })

  return matches
}

const blockKinds = Array.of(ts.SyntaxKind.Block)

export const preferConditionalReturn = defineCheck(
  "prefer-conditional-return",
  blockKinds,
  ts.isBlock,
  conditionalReturnDetections
)
