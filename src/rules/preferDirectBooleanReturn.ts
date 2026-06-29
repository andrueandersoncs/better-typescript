import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import {
  hasNoElseBranch,
  lastStatement,
  unwrapExpression,
  unwrapSingleStatementBlock
} from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

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

const directBooleanRuleMatch =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (literalValue: boolean): RuleMatch => {
    const conditionText = ifStatement.expression.getText(context.sourceFile)
    const returnExpression = literalValue
      ? `(${conditionText})`
      : `!(${conditionText})`
    const literalText = String(literalValue)

    return createRuleMatch(context, {
      ruleId,
      node: ifStatement,
      message: `Avoid returning ${literalText} from a conditional branch.`,
      hint: `Use the condition as the boolean value instead: return ${returnExpression}.`
    })
  }

const directBooleanMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  pipe(
    Option.gen(function* () {
      const unwrappedStatement = unwrapSingleStatementBlock(
        ifStatement.thenStatement
      )
      const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
        unwrappedStatement
      )
      const expression = yield* Option.fromNullable(returnStatement.expression)

      return yield* booleanLiteralValue(expression)
    }),
    Option.map(directBooleanRuleMatch(context, ifStatement)),
    Option.toArray
  )

const literalBooleanCheck = onNode(
  [ts.SyntaxKind.IfStatement],
  ts.isIfStatement,
  directBooleanMatches
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
  (context: RuleContext, nextStatement: Option.Option<ts.Statement>) =>
  (ifStatement: ts.IfStatement): Option.Option<RuleMatch> =>
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

      return createRuleMatch(context, {
        ruleId,
        node: ifStatement,
        message: "Avoid conditional return followed by return false.",
        hint: "Return a boolean expression using && instead of branching to return false."
      })
    })

const statementConditionalFalseMatch =
  (context: RuleContext, block: ts.Block) =>
  (statement: ts.Statement, index: number): Option.Option<RuleMatch> => {
    const nextStatement = Option.fromNullable(block.statements[index + 1])

    return pipe(
      Option.liftPredicate(ts.isIfStatement)(statement),
      Option.flatMap(conditionalFalseReturnMatch(context, nextStatement))
    )
  }

const conditionalFalseReturnMatches = (
  block: ts.Block,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Array.filterMap(
    block.statements,
    statementConditionalFalseMatch(context, block)
  )

const conditionalFalseCheck = onNode(
  [ts.SyntaxKind.Block],
  ts.isBlock,
  conditionalFalseReturnMatches
)

// --- Combined ---

const check = combineAll([literalBooleanCheck, conditionalFalseCheck])

const badLiteralExample = new ExampleSnippet({
  filePath: "src/age.ts",
  code: `if (age >= 18) {
  return true
}
return false`
})

const goodLiteralExample = new ExampleSnippet({
  filePath: "src/age.ts",
  code: `return age >= 18`
})

const badConditionalFalseExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `if (isValid(input)) {
  const parsed = parse(input)
  return hasRequiredFields(parsed)
}
return false`
})

const goodConditionalFalseExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `return isValid(input) && hasRequiredFields(parse(input))`
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
