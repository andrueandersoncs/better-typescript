import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-conditional-return"
const maximumReturnExpressionLength = 100

const containsYieldExpression = (node: ts.Node): boolean => {
  const isYield = ts.isYieldExpression(node)
  const childContainsYield =
    ts.forEachChild(node, containsYieldExpression) === true

  return isYield || childContainsYield
}

// A branch already returning a ternary would collapse into a nested ternary, which no-multiple-boolean-operators forbids; leave those if statements alone.
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
) => Option.Option<RuleMatch>

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
  (match: CreateMatch) =>
  (nextStatement: Option.Option<ts.Statement>) =>
  (ifStatement: ts.IfStatement): Option.Option<RuleMatch> =>
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
        ruleId,
        node: ifStatement,
        message:
          "Avoid if statements that only choose between two return values.",
        hint: `Return a conditional expression instead: return ${returnText}.`
      })
    })

type IfConditionalMatch = (
  nextStatement: Option.Option<ts.Statement>
) => (ifStatement: ts.IfStatement) => Option.Option<RuleMatch>

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

// The context stage runs once per file, so every partial below is shared by all Blocks the dispatcher feeds to matches.
const conditionalReturnRuleMatches = (context: RuleContext) => {
  const returnExpression = returnExpressionFromStatement(context.sourceFile)
  const standardTernary = standardTernaryText(context.sourceFile)
  const flippedTernary = flippedTernaryText(context.sourceFile)
  const match = createRuleMatch(context)
  const ifMatch =
    conditionalReturnMatch(returnExpression)(standardTernary)(flippedTernary)(
      match
    )
  const conditionalMatch = statementConditionalMatch(ifMatch)

  const matches = (block: ts.Block): ReadonlyArray<RuleMatch> =>
    Array.filterMap(block.statements, conditionalMatch(block))

  return matches
}

const check = onNode([ts.SyntaxKind.Block])(ts.isBlock)(
  conditionalReturnRuleMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/parity.ts",
  code: `declare const isEven: (n: number) => boolean

export const parityLabel = (n: number): string => {
  if (isEven(n)) {
    return "even"
  } else {
    return "odd"
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/parity.ts",
  code: `declare const isEven: (n: number) => boolean

export const parityLabel = (n: number): string =>
  isEven(n) ? "even" : "odd"`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferConditionalReturn = new Rule({
  id: ruleId,
  description:
    "Prefer conditional return expressions over if statements that choose between two values.",
  example,
  check
})
