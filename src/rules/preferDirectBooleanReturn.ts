import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import {
  hasNoElseBranch,
  lastStatement,
  unwrapExpression,
  unwrapSingleStatementBlock
} from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "prefer-direct-boolean-return"

// --- Shared helpers ---

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

// --- Literal boolean return from conditional branch ---
type StatementConditionalFalseMatch = (
  statement: ts.Statement,
  index: number
) => Option.Option<Finding>

const directBooleanRuleMatch =
  (sourceFile: ts.SourceFile) =>
  (match: CreateMatch) =>
  (ifStatement: ts.IfStatement) =>
  (literalValue: boolean): Finding => {
    const conditionText = ifStatement.expression.getText(sourceFile)
    const returnExpression = literalValue
      ? `(${conditionText})`
      : `!(${conditionText})`
    const literalText = String(literalValue)

    return match({
      ruleId,
      node: ifStatement,
      message: `Avoid returning ${literalText} from a conditional branch.`,
      hint: `Use the condition as the boolean value instead: return ${returnExpression}.`
    })
  }

type DirectBooleanRuleMatch = (
  ifStatement: ts.IfStatement
) => (literalValue: boolean) => Finding

const directBooleanMatches =
  (ruleMatch: DirectBooleanRuleMatch) =>
  (ifStatement: ts.IfStatement): ReadonlyArray<Finding> =>
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

// --- Conditional return followed by return false ---

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
  (match: CreateMatch) =>
  (nextStatement: Option.Option<ts.Statement>) =>
  (ifStatement: ts.IfStatement): Option.Option<Finding> =>
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
        ruleId,
        node: ifStatement,
        message: "Avoid conditional return followed by return false.",
        hint: "Return a boolean expression using && instead of branching to return false."
      })
    })

const statementConditionalFalseMatch =
  (match: CreateMatch) =>
  (block: ts.Block): StatementConditionalFalseMatch =>
  (statement, index) => {
    const nextStatement = Option.fromNullable(block.statements[index + 1])

    return pipe(
      Option.liftPredicate(ts.isIfStatement)(statement),
      Option.flatMap(conditionalFalseReturnMatch(match)(nextStatement))
    )
  }

const conditionalFalseReturnMatches =
  (match: CreateMatch) =>
  (block: ts.Block): ReadonlyArray<Finding> =>
    Array.filterMap(
      block.statements,
      statementConditionalFalseMatch(match)(block)
    )

// --- Combined ---

type BooleanReturnTarget = ts.IfStatement | ts.Block

const isBooleanReturnTarget = (node: ts.Node): node is BooleanReturnTarget =>
  ts.isIfStatement(node) || ts.isBlock(node)

const booleanReturnTargetKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.Block
]

// The context stage runs once per file, so every partial below is shared by all IfStatements and Blocks the dispatcher feeds to matches.
const booleanReturnMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)
  const literalMatches = directBooleanMatches(
    directBooleanRuleMatch(context.sourceFile)(match)
  )
  const falseMatches = conditionalFalseReturnMatches(match)

  const matches = (node: BooleanReturnTarget): ReadonlyArray<Finding> =>
    ts.isIfStatement(node) ? literalMatches(node) : falseMatches(node)

  return matches
}

const check = onNode(booleanReturnTargetKinds)(isBooleanReturnTarget)(
  booleanReturnMatches
)

const badLiteralExample = new ExampleSnippet({
  filePath: "src/age.ts",
  code: `export const isAdult = (age: number): boolean => {
  if (age >= 18) {
    return true
  }
  return false
}`
})

const goodLiteralExample = new ExampleSnippet({
  filePath: "src/age.ts",
  code: `export const isAdult = (age: number): boolean => age >= 18`
})

const badConditionalFalseExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `declare const isValid: (input: string) => boolean
declare const parse: (input: string) => unknown
declare const hasRequiredFields: (parsed: unknown) => boolean

export const isUsable = (input: string): boolean => {
  if (isValid(input)) {
    const parsed = parse(input)
    return hasRequiredFields(parsed)
  }
  return false
}`
})

const goodConditionalFalseExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `declare const isValid: (input: string) => boolean
declare const parse: (input: string) => unknown
declare const hasRequiredFields: (parsed: unknown) => boolean

export const isUsable = (input: string): boolean => {
  const parsed = parse(input)

  return isValid(input) && hasRequiredFields(parsed)
}`
})

const example = new RuleExample({
  bad: [badLiteralExample, badConditionalFalseExample],
  good: [goodLiteralExample, goodConditionalFalseExample]
})

export const preferDirectBooleanReturn = new Rule({
  id: ruleId,
  description:
    "Prefer returning boolean expressions directly instead of conditional boolean literals.",
  example,
  check
})
