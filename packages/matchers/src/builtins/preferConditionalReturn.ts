import { Array, Function, Option, pipe, Result, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// PreferConditionalReturnFact carries the ternary text because guidance rewrites the return.
export const PreferConditionalReturnFact = Schema.Struct({
  returnText: Schema.String
})

export interface PreferConditionalReturnFact extends Schema.Schema.Type<
  typeof PreferConditionalReturnFact
> {}

const maximumReturnExpressionLength = 100

const containsYieldExpression = (node: ts.Node): boolean => {
  const isYield = ts.isYieldExpression(node)
  const childResult = ts.forEachChild(node, containsYieldExpression)
  const childContainsYield = strictEqual(true)(childResult)

  return isYield || childContainsYield
}

const negatedPrefixUnaryExpressionOperand = (
  expression: ts.PrefixUnaryExpression
): Option.Option<ts.Expression> => {
  const isNegation = strictEqual(ts.SyntaxKind.ExclamationToken)(expression.operator)

  return isNegation ? Option.some(expression.operand) : Option.none()
}

const ternaryText =
  (sourceFile: ts.SourceFile) =>
  (condition: ts.Expression) =>
  (whenTrue: ts.Expression) =>
  (whenFalse: ts.Expression) => {
    const conditionText = condition.getText(sourceFile)
    const whenTrueText = whenTrue.getText(sourceFile)
    const whenFalseText = whenFalse.getText(sourceFile)
    const ternaryParts = Array.make(`(${conditionText})`, "?", whenTrueText, ":", whenFalseText)

    return Array.join(ternaryParts, " ")
  }

const blockKinds = Array.of(ts.SyntaxKind.Block)

const matches = (context: MatchContext) => {
  const sourceFile = context.sourceFile

  const isEligibleReturnExpression = (expression: ts.Expression) => {
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
  }

  const returnExpression = (statement: ts.Statement) =>
    Option.gen(function* () {
      const unwrappedStatement = unwrapSingleStatementBlock(statement)
      const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(unwrappedStatement)
      const expression = yield* Option.fromNullishOr(returnStatement.expression)

      return yield* Option.liftPredicate(isEligibleReturnExpression)(expression)
    })

  const matchBlock = (block: ts.Block) => {
    const matchStatement = (statement: ts.Statement, index: number) => {
      const nextStatement = Option.fromNullishOr(block.statements[index + 1])

      const conditionalFromIf = (ifStatement: ts.IfStatement) =>
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

          const fact = PreferConditionalReturnFact.make({ returnText })

          return makeNodeMatch(ifStatement, fact)
        })

      return pipe(
        Option.liftPredicate(ts.isIfStatement)(statement),
        Option.flatMap(conditionalFromIf),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(block.statements, matchStatement)
  }

  return matchBlock
}

export const preferConditionalReturnMatcher = nodeMatcher(blockKinds)(ts.isBlock)(matches)
