import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  hasNoElseBranch,
  lastStatement,
  unwrapExpression,
  unwrapSingleStatementBlock
} from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const booleanLiteralValue = (
  expression: ts.Expression
): Option.Option<boolean> => {
  const unwrapped = unwrapExpression(expression)

  return pipe(
    Match.value(unwrapped.kind),
    Match.when(ts.SyntaxKind.TrueKeyword, Function.constTrue),
    Match.when(ts.SyntaxKind.FalseKeyword, Function.constFalse),
    Match.option
  )
}

const isNonBooleanLiteral = (expression: ts.Expression): boolean =>
  !pipe(expression, booleanLiteralValue, Option.isSome)

const returnStatementExpression = (
  statement: ts.ReturnStatement
): Option.Option<ts.Expression> => Option.fromNullable(statement.expression)

const isFalseKeyword = (expression: ts.Expression): boolean =>
  unwrapExpression(expression).kind === ts.SyntaxKind.FalseKeyword

const isFalseLiteralReturn = (statement: ts.Statement): boolean =>
  pipe(
    Option.liftPredicate(ts.isReturnStatement)(statement),
    Option.flatMap(returnStatementExpression),
    Option.map(unwrapExpression),
    Option.exists(isFalseKeyword)
  )

type BooleanReturnTarget = ts.IfStatement | ts.Block | ts.ConditionalExpression

const isBooleanReturnTarget = (node: ts.Node): node is BooleanReturnTarget => {
  const conditions = Array.make(
    ts.isIfStatement(node),
    ts.isBlock(node),
    ts.isConditionalExpression(node)
  )

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

  const literalBranchMatch = (
    node: ts.Node,
    condition: ts.Expression,
    literalValue: boolean
  ): Detection => {
    const conditionText = condition.getText(sourceFile)

    const returnExpression = literalValue
      ? `(${conditionText})`
      : `!(${conditionText})`

    const literalText = String(literalValue)

    return match({
      node,
      message: `Avoid returning ${literalText} from a conditional branch.`,
      hint: `Use the condition as the boolean value instead: return ${returnExpression}.`
    })
  }

  const andFalseMatch = (node: ts.Node): Detection =>
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
        Option.filter(
          ({ trueLiteral, falseLiteral }) => trueLiteral !== falseLiteral
        ),
        Option.map(({ trueLiteral }) =>
          literalBranchMatch(node, node.condition, trueLiteral)
        )
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
          const unwrappedStatement = unwrapSingleStatementBlock(
            node.thenStatement
          )

          const returnStatement = yield* Option.liftPredicate(
            ts.isReturnStatement
          )(unwrappedStatement)

          const expression = yield* Option.fromNullable(
            returnStatement.expression
          )

          return yield* booleanLiteralValue(expression)
        }),
        Option.map((literalValue) =>
          literalBranchMatch(node, node.expression, literalValue)
        ),
        Option.toArray
      )
    }

    return Array.filterMap(node.statements, (statement, index) => {
      const nextStatement = Option.fromNullable(node.statements[index + 1])

      return pipe(
        Option.liftPredicate(ts.isIfStatement)(statement),
        Option.flatMap((ifStatement) =>
          Option.gen(function* () {
            yield* Option.liftPredicate(hasNoElseBranch)(ifStatement)

            const thenBranchExpr = ts.isBlock(ifStatement.thenStatement)
              ? pipe(
                  lastStatement(ifStatement.thenStatement),
                  Option.filter(ts.isReturnStatement),
                  Option.flatMap(returnStatementExpression)
                )
              : pipe(
                  Option.liftPredicate(ts.isReturnStatement)(
                    ifStatement.thenStatement
                  ),
                  Option.flatMap(returnStatementExpression)
                )

            yield* pipe(thenBranchExpr, Option.filter(isNonBooleanLiteral))
            yield* Option.filter(nextStatement, isFalseLiteralReturn)

            return andFalseMatch(ifStatement)
          })
        )
      )
    })
  }

  return matches
}

const check = nodeCheck(booleanReturnTargetKinds)(isBooleanReturnTarget)(
  booleanReturnMatches
)

export const preferDirectBooleanReturn: Check = check

export const preferDirectBooleanReturnExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-direct-boolean-return")
