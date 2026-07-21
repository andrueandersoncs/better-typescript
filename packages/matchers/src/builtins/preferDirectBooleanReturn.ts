import { Array, Function, Match, Option, Struct, flow, pipe, Result, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type Match as MatcherMatch, type MatchContext } from "../matcher/data.js"
import {
  returnStatementExpression,
  unwrapExpression,
  unwrapSingleStatementBlock
} from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const literalBranchKind = Schema.Literal("literal-branch")
const andFalseKind = Schema.Literal("and-false")

// PreferDirectBooleanReturnLiteralBranchFact is literal-branch evidence because conditions quote.
export const PreferDirectBooleanReturnLiteralBranchFact = Schema.Struct({
  kind: literalBranchKind,
  literalValue: Schema.Boolean,
  conditionText: Schema.String
})

export interface PreferDirectBooleanReturnLiteralBranchFact extends Schema.Schema.Type<
  typeof PreferDirectBooleanReturnLiteralBranchFact
> {}

// PreferDirectBooleanReturnAndFalseFact is and-false evidence because false short-circuits rewrite.
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

// BooleanReturnTarget is a local syntax union because matchers need one narrowed node shape.
export type BooleanReturnTarget = ts.IfStatement | ts.Block | ts.ConditionalExpression

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

const isFalseKeyword = flow(
  unwrapExpression,
  Struct.get<ts.Expression, "kind">("kind"),
  strictEqual(ts.SyntaxKind.FalseKeyword)
)

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
  const sourceFile = context.sourceFile

  const literalBranchMatch = (
    node: ts.Node,
    condition: ts.Expression,
    literalValue: boolean
  ): MatcherMatch<PreferDirectBooleanReturnFact> => {
    const conditionText = condition.getText(sourceFile)

    const fact = PreferDirectBooleanReturnFact.make({
      kind: "literal-branch",
      literalValue,
      conditionText
    })

    return nodeMatch(node, fact)
  }

  const andFalseMatch = (node: ts.Node): MatcherMatch<PreferDirectBooleanReturnFact> => {
    const fact = PreferDirectBooleanReturnFact.make({ kind: "and-false" })

    return nodeMatch(node, fact)
  }

  const matchBooleanReturnTarget = (
    node: BooleanReturnTarget
  ): ReadonlyArray<MatcherMatch<PreferDirectBooleanReturnFact>> => {
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

        return literalBranchMatch(node, node.condition, whenTrueLiteral)
      })

      const falseElseDetection = andFalseMatch(node)
      const whenTrueIsNonBooleanLiteral = () => isNonBooleanLiteral(whenTrue)
      const whenFalseIsNonBooleanLiteral = () => isNonBooleanLiteral(whenFalse)

      const falseElseArm = pipe(
        Option.some(whenFalse),
        Option.filter(isFalseKeyword),
        Option.filter(whenTrueIsNonBooleanLiteral),
        Option.as(falseElseDetection)
      )

      const falseThenDetection = andFalseMatch(node)

      const falseThenArm = pipe(
        Option.some(whenTrue),
        Option.filter(isFalseKeyword),
        Option.filter(whenFalseIsNonBooleanLiteral),
        Option.as(falseThenDetection)
      )

      const ternaryReturnCandidates = Array.make(bothLiteral, falseElseArm, falseThenArm)

      return pipe(Option.firstSomeOf(ternaryReturnCandidates), Option.toArray)
    }

    if (ts.isIfStatement(node)) {
      const matchLiteralBranch = (literalValue: boolean) =>
        literalBranchMatch(node, node.expression, literalValue)

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
        const blockStatements = block.statements
        const lastIndex = blockStatements.length - 1
        const lastThenStatement = Option.fromNullishOr(blockStatements[lastIndex])

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

          const thenStatement = ifStatement.thenStatement
          const thenBlock = Option.liftPredicate(ts.isBlock)(thenStatement)

          const thenBranchExpr = Option.match(thenBlock, {
            onNone: () =>
              pipe(
                Option.liftPredicate(ts.isReturnStatement)(thenStatement),
                Option.flatMap(returnStatementExpression)
              ),
            onSome: lastReturnExpression
          })

          yield* pipe(thenBranchExpr, Option.filter(isNonBooleanLiteral))
          yield* Option.filter(nextStatement, isFalseLiteralReturn)

          return andFalseMatch(ifStatement)
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

export const preferDirectBooleanReturnMatcher =
  nodeMatcher(booleanReturnTargetKinds)(isBooleanReturnTarget)(matches)
