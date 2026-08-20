import { Array, Function, Option, Result, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Match as ScannerMatch } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { returnStatementExpression } from "../../internal/support/returnStatementExpression.js"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"
import { unwrapSingleStatementBlock } from "../../internal/support/unwrapSingleStatementBlock.js"
import { strictEqual } from "../../internal/equivalence.js"
import type { BooleanReturnTarget } from "./booleanReturnTarget.js"
import { booleanLiteralValue } from "./booleanLiteralValue.js"
import { isFalseKeyword } from "./isFalseKeyword.js"

const literalBranchKind = Schema.Literal("literal-branch")
const andFalseKind = Schema.Literal("and-false")

// PreferDirectBooleanReturnLiteralBranchFact exists because its fields form one stable data contract used by the linter.
export const PreferDirectBooleanReturnLiteralBranchFact = Schema.Struct({
  kind: literalBranchKind,
  literalValue: Schema.Boolean,
  conditionText: Schema.String
})

export interface PreferDirectBooleanReturnLiteralBranchFact extends Schema.Schema.Type<
  typeof PreferDirectBooleanReturnLiteralBranchFact
> {}

// PreferDirectBooleanReturnAndFalseFact exists because its fields form one stable data contract used by the linter.
export const PreferDirectBooleanReturnAndFalseFact = Schema.Struct({
  kind: andFalseKind
})

export interface PreferDirectBooleanReturnAndFalseFact extends Schema.Schema.Type<
  typeof PreferDirectBooleanReturnAndFalseFact
> {}

const directBooleanReturnMembers = Array.make(
  PreferDirectBooleanReturnLiteralBranchFact,
  PreferDirectBooleanReturnAndFalseFact
)

// PreferDirectBooleanReturnFact unions branch shapes because literal and and-false differ.
export const PreferDirectBooleanReturnFact = Schema.Union(directBooleanReturnMembers)

export type PreferDirectBooleanReturnFact = Schema.Schema.Type<typeof PreferDirectBooleanReturnFact>

const isNonBooleanLiteral = (expression: ts.Expression) =>
  !pipe(expression, booleanLiteralValue, Option.isSome)

const isFalseLiteralReturn = (statement: ts.Statement) =>
  pipe(
    Option.liftPredicate(ts.isReturnStatement)(statement),
    Option.flatMap(returnStatementExpression),
    Option.map(unwrapExpression),
    Option.exists(isFalseKeyword)
  )

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

const matches = (context: MatchContext) => {
  const makeLiteralBranchMatch =
    (condition: ts.Expression) =>
    (literalValue: boolean) =>
    (node: ts.Node): ScannerMatch<PreferDirectBooleanReturnFact> => {
      const conditionText = condition.getText(context.sourceFile)

      const fact = PreferDirectBooleanReturnFact.make({
        kind: "literal-branch",
        literalValue,
        conditionText
      })

      return makeNodeMatch(node, fact)
    }

  const makeAndFalseMatch = (node: ts.Node): ScannerMatch<PreferDirectBooleanReturnFact> => {
    const fact = PreferDirectBooleanReturnFact.make({ kind: "and-false" })

    return makeNodeMatch(node, fact)
  }

  const matchBooleanReturnTarget = (
    node: BooleanReturnTarget
  ): ReadonlyArray<ScannerMatch<PreferDirectBooleanReturnFact>> => {
    if (ts.isConditionalExpression(node)) {
      const whenTrue = unwrapExpression(node.whenTrue)
      const whenFalse = unwrapExpression(node.whenFalse)
      const trueLiteral = booleanLiteralValue(whenTrue)
      const falseLiteral = booleanLiteralValue(whenFalse)

      const bothLiteral = Option.gen(function* () {
        const whenTrueLiteral = yield* trueLiteral
        const whenFalseLiteral = yield* falseLiteral
        const literalsMatch = strictEqual(whenFalseLiteral)(whenTrueLiteral)

        yield* Option.liftPredicate((value: boolean) => !value)(literalsMatch)

        return makeLiteralBranchMatch(node.condition)(whenTrueLiteral)(node)
      })

      const falseElseCandidate = makeAndFalseMatch(node)
      const whenTrueIsNonBooleanLiteral = () => isNonBooleanLiteral(whenTrue)
      const whenFalseIsNonBooleanLiteral = () => isNonBooleanLiteral(whenFalse)

      const falseElseArm = pipe(
        Option.some(whenFalse),
        Option.filter(isFalseKeyword),
        Option.filter(whenTrueIsNonBooleanLiteral),
        Option.as(falseElseCandidate)
      )

      const falseThenCandidate = makeAndFalseMatch(node)

      const falseThenArm = pipe(
        Option.some(whenTrue),
        Option.filter(isFalseKeyword),
        Option.filter(whenFalseIsNonBooleanLiteral),
        Option.as(falseThenCandidate)
      )

      const ternaryReturnCandidates = Array.make(bothLiteral, falseElseArm, falseThenArm)

      return pipe(Option.firstSomeOf(ternaryReturnCandidates), Option.toArray)
    }

    if (ts.isIfStatement(node)) {
      const matchLiteralBranch = Function.flip(makeLiteralBranchMatch(node.expression))(node)

      return pipe(
        Option.gen(function* () {
          const unwrappedStatement = unwrapSingleStatementBlock(node.thenStatement)

          const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
            unwrappedStatement
          )

          const expression = yield* Option.fromNullishOr(returnStatement.expression)

          return yield* booleanLiteralValue(expression)
        }),
        Option.map(matchLiteralBranch),
        Option.toArray
      )
    }

    return Array.filterMap(node.statements, (statement, index) => {
      const nextStatement = Option.fromNullishOr(node.statements[index + 1])

      const lastReturnExpression = (block: ts.Block) => {
        const lastIndex = block.statements.length - 1
        const lastThenStatement = Option.fromNullishOr(block.statements[lastIndex])

        return pipe(
          lastThenStatement,
          Option.filter(ts.isReturnStatement),
          Option.flatMap(returnStatementExpression)
        )
      }

      const andFalseFromIf = (ifStatement: ts.IfStatement) =>
        Option.gen(function* () {
          const elseBranch = Option.fromNullishOr(ifStatement.elseStatement)
          yield* Option.liftPredicate(Option.isNone)(elseBranch)

          const thenBlock = Option.liftPredicate(ts.isBlock)(ifStatement.thenStatement)

          const thenBranchExpr = Option.match(thenBlock, {
            onNone: () =>
              pipe(
                Option.liftPredicate(ts.isReturnStatement)(ifStatement.thenStatement),
                Option.flatMap(returnStatementExpression)
              ),
            onSome: lastReturnExpression
          })

          yield* pipe(thenBranchExpr, Option.filter(isNonBooleanLiteral))
          yield* Option.filter(nextStatement, isFalseLiteralReturn)

          return makeAndFalseMatch(ifStatement)
        })

      return pipe(
        Option.liftPredicate(ts.isIfStatement)(statement),
        Option.flatMap(andFalseFromIf),
        Result.fromOption(Function.constVoid)
      )
    })
  }

  return matchBooleanReturnTarget
}

export const preferDirectBooleanReturnScanner =
  makeNodeScanner(booleanReturnTargetKinds)(isBooleanReturnTarget)(matches)
