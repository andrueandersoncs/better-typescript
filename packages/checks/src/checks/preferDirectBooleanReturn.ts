import { Array, Function, Match, Option, pipe, Result } from "effect"
import * as ts from "typescript"
import { unwrapExpression, unwrapSingleStatementBlock } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { detection } from "@better-typescript/core/engine/check"
import { defineCheck } from "../defineCheck.js"

const booleanLiteralValue = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return pipe(
    Match.value(unwrapped.kind),
    Match.when(ts.SyntaxKind.TrueKeyword, Function.constTrue),
    Match.when(ts.SyntaxKind.FalseKeyword, Function.constFalse),
    Match.option
  )
}

const isNonBooleanLiteral = (expression: ts.Expression) =>
  !pipe(expression, booleanLiteralValue, Option.isSome)

const returnStatementExpression = (statement: ts.ReturnStatement) =>
  Option.fromNullishOr(statement.expression)

const isFalseKeyword = (expression: ts.Expression) =>
  unwrapExpression(expression).kind === ts.SyntaxKind.FalseKeyword

const isFalseLiteralReturn = (statement: ts.Statement) =>
  pipe(
    Option.liftPredicate(ts.isReturnStatement)(statement),
    Option.flatMap(returnStatementExpression),
    Option.map(unwrapExpression),
    Option.exists(isFalseKeyword)
  )

// BooleanReturnTarget is shared syntax contract because detection and matching need one vocabulary.
export type BooleanReturnTarget = ts.IfStatement | ts.Block | ts.ConditionalExpression

const isBooleanReturnTarget = (node: ts.Node): node is BooleanReturnTarget => {
  const ifStatement = ts.isIfStatement(node)
  const block = ts.isBlock(node)
  const conditionalExpression = ts.isConditionalExpression(node)
  const conditions = Array.make(ifStatement, block, conditionalExpression)

  return Array.some(conditions, Boolean)
}

const booleanReturnTargetKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.Block,
  ts.SyntaxKind.ConditionalExpression
)

const andFalseHint =
  "Use && instead of branching to false (`cond && value`). When the false " +
  "branch is the then-arm (`cond ? false : value`), negate the condition into " +
  "a named boolean first so `!` and `&&` are not stacked in one expression."

const booleanReturnMatches = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const match = detection(context)

  const literalBranchMatch = (node: ts.Node, condition: ts.Expression, literalValue: boolean) => {
    const conditionText = condition.getText(sourceFile)
    const returnExpression = literalValue ? `(${conditionText})` : `!(${conditionText})`
    const literalText = String(literalValue)

    return match({
      node,
      message: `Avoid returning ${literalText} from a conditional branch.`,
      hint: `Use the condition as the boolean value instead: return ${returnExpression}.`
    })
  }

  const andFalseMatch = (node: ts.Node) =>
    match({
      node,
      message: "Avoid conditional return followed by return false.",
      hint: andFalseHint
    })

  const matches = (node: BooleanReturnTarget): ReadonlyArray<Detection> => {
    if (ts.isConditionalExpression(node)) {
      const whenTrue = unwrapExpression(node.whenTrue)
      const whenFalse = unwrapExpression(node.whenFalse)
      const trueLiteral = booleanLiteralValue(whenTrue)
      const falseLiteral = booleanLiteralValue(whenFalse)

      const bothLiteral = pipe(
        Option.all({ trueLiteral, falseLiteral }),
        Option.filter(({ trueLiteral, falseLiteral }) => trueLiteral !== falseLiteral),
        Option.map(({ trueLiteral }) => literalBranchMatch(node, node.condition, trueLiteral))
      )

      const falseElseDetection = andFalseMatch(node)

      const falseElseArm = pipe(
        Option.some(whenFalse),
        Option.filter(isFalseKeyword),
        Option.filter(() => isNonBooleanLiteral(whenTrue)),
        Option.as(falseElseDetection)
      )

      const falseThenDetection = andFalseMatch(node)

      const falseThenArm = pipe(
        Option.some(whenTrue),
        Option.filter(isFalseKeyword),
        Option.filter(() => isNonBooleanLiteral(whenFalse)),
        Option.as(falseThenDetection)
      )

      const ternaryReturnCandidates = Array.make(bothLiteral, falseElseArm, falseThenArm)

      return pipe(Option.firstSomeOf(ternaryReturnCandidates), Option.toArray)
    }

    if (ts.isIfStatement(node)) {
      return pipe(
        Option.gen(function* () {
          const unwrappedStatement = unwrapSingleStatementBlock(node.thenStatement)

          const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
            unwrappedStatement
          )

          const expression = yield* Option.fromNullishOr(returnStatement.expression)

          return yield* booleanLiteralValue(expression)
        }),
        Option.map((literalValue) => literalBranchMatch(node, node.expression, literalValue)),
        Option.toArray
      )
    }

    return Array.filterMap(node.statements, (statement, index) => {
      const nextStatement = Option.fromNullishOr(node.statements[index + 1])

      return pipe(
        Option.liftPredicate(ts.isIfStatement)(statement),
        Option.flatMap((ifStatement) =>
          Option.gen(function* () {
            const elseBranch = Option.fromNullishOr(ifStatement.elseStatement)
            yield* Option.liftPredicate(Option.isNone)(elseBranch)

            const thenStatement = ifStatement.thenStatement
            const thenBlock = Option.liftPredicate(ts.isBlock)(thenStatement)

            const thenBranchExpr = Option.match(thenBlock, {
              onNone: () =>
                pipe(
                  Option.liftPredicate(ts.isReturnStatement)(thenStatement),
                  Option.flatMap(returnStatementExpression)
                ),
              onSome: (block) => {
                const blockStatements = block.statements
                const lastIndex = blockStatements.length - 1
                const lastThenStatement = Option.fromNullishOr(blockStatements[lastIndex])

                return pipe(
                  lastThenStatement,
                  Option.filter(ts.isReturnStatement),
                  Option.flatMap(returnStatementExpression)
                )
              }
            })

            yield* pipe(thenBranchExpr, Option.filter(isNonBooleanLiteral))
            yield* Option.filter(nextStatement, isFalseLiteralReturn)

            return andFalseMatch(ifStatement)
          })
        ),
        Result.fromOption(Function.constVoid)
      )
    })
  }

  return matches
}

export const preferDirectBooleanReturn = defineCheck(
  "prefer-direct-boolean-return",
  booleanReturnTargetKinds,
  isBooleanReturnTarget,
  booleanReturnMatches
)
