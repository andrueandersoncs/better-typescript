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
import type { MakeDetection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
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

type StatementConditionalFalseMatch = (
  statement: ts.Statement,
  index: number
) => Option.Option<Detection>

const directBooleanDetection =
  (sourceFile: ts.SourceFile) =>
  (match: MakeDetection) =>
  (ifStatement: ts.IfStatement) =>
  (literalValue: boolean): Detection => {
    const conditionText = ifStatement.expression.getText(sourceFile)
    const returnExpression = literalValue
      ? `(${conditionText})`
      : `!(${conditionText})`
    const literalText = String(literalValue)

    return match({
      node: ifStatement,
      message: `Avoid returning ${literalText} from a conditional branch.`,
      hint: `Use the condition as the boolean value instead: return ${returnExpression}.`
    })
  }

type DirectBooleanDetection = (
  ifStatement: ts.IfStatement
) => (literalValue: boolean) => Detection

const directBooleanMatches =
  (ruleMatch: DirectBooleanDetection) =>
  (ifStatement: ts.IfStatement): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const unwrappedStatement = unwrapSingleStatementBlock(
          ifStatement.thenStatement
        )
        const returnStatement = yield* Option.liftPredicate(
          ts.isReturnStatement
        )(unwrappedStatement)
        const expression = yield* Option.fromNullable(
          returnStatement.expression
        )

        return yield* booleanLiteralValue(expression)
      }),
      Option.map(ruleMatch(ifStatement)),
      Option.toArray
    )

const isFalseKeyword = (expression: ts.Expression): boolean =>
  unwrapExpression(expression).kind === ts.SyntaxKind.FalseKeyword

const isFalseLiteralReturn = (statement: ts.Statement): boolean =>
  pipe(
    Option.liftPredicate(ts.isReturnStatement)(statement),
    Option.flatMap(returnStatementExpression),
    Option.map(unwrapExpression),
    Option.exists(isFalseKeyword)
  )

const conditionalFalseReturnMatch =
  (match: MakeDetection) =>
  (nextStatement: Option.Option<ts.Statement>) =>
  (ifStatement: ts.IfStatement): Option.Option<Detection> =>
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

      return match({
        node: ifStatement,
        message: "Avoid conditional return followed by return false.",
        hint: "Return a boolean expression using && instead of branching to return false."
      })
    })

const statementConditionalFalseMatch =
  (match: MakeDetection) =>
  (block: ts.Block): StatementConditionalFalseMatch =>
  (statement, index) => {
    const nextStatement = Option.fromNullable(block.statements[index + 1])

    return pipe(
      Option.liftPredicate(ts.isIfStatement)(statement),
      Option.flatMap(conditionalFalseReturnMatch(match)(nextStatement))
    )
  }

const conditionalFalseReturnMatches =
  (match: MakeDetection) =>
  (block: ts.Block): ReadonlyArray<Detection> =>
    Array.filterMap(
      block.statements,
      statementConditionalFalseMatch(match)(block)
    )

type BooleanReturnTarget = ts.IfStatement | ts.Block

const isBooleanReturnTarget = (node: ts.Node): node is BooleanReturnTarget =>
  ts.isIfStatement(node) || ts.isBlock(node)

const booleanReturnTargetKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.Block
]

const booleanReturnMatches = (context: CheckContext) => {
  const match = detection(context)
  const literalMatches = directBooleanMatches(
    directBooleanDetection(context.sourceFile)(match)
  )
  const falseMatches = conditionalFalseReturnMatches(match)

  const matches = (node: BooleanReturnTarget): ReadonlyArray<Detection> =>
    ts.isIfStatement(node) ? literalMatches(node) : falseMatches(node)

  return matches
}

const check = nodeCheck(booleanReturnTargetKinds)(isBooleanReturnTarget)(
  booleanReturnMatches
)

export const preferDirectBooleanReturn: Check = check

export const preferDirectBooleanReturnExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-direct-boolean-return")
