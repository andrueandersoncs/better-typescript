import * as path from "node:path"
import { Chunk, Effect, Match, Option, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-direct-boolean-return"

interface BooleanReturn {
  readonly value: boolean
}

interface DirectBooleanReturnMatch {
  readonly ifStatement: ts.IfStatement
  readonly literalValue: boolean
  readonly returnExpression: string
}

export const preferDirectBooleanReturn: Rule = {
  id: ruleId,
  description: "Prefer returning boolean expressions directly instead of conditional boolean literals.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isIfStatement),
        Stream.filterMap((ifStatement) => directBooleanReturnMatch(context, ifStatement)),
        Stream.map((match) => createMatch(context, match)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const directBooleanReturnMatch = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<DirectBooleanReturnMatch> => {
  const thenReturn = booleanReturnFromStatement(ifStatement.thenStatement)

  return Option.match(thenReturn, {
    onNone: () => Option.none(),
    onSome: (thenReturn) => {
      const conditionText = ifStatement.expression.getText(context.sourceFile)

      return Option.some({
        ifStatement,
        literalValue: thenReturn.value,
        returnExpression: thenReturn.value ? `(${conditionText})` : `!(${conditionText})`
      })
    }
  })
}

const booleanReturnFromStatement = (
  statement: ts.Statement
): Option.Option<BooleanReturn> => {
  const returnStatement = unwrapSingleStatementBlock(statement)

  if (!ts.isReturnStatement(returnStatement)) {
    return Option.none()
  }

  return Option.match(Option.fromNullable(returnStatement.expression), {
    onNone: () => Option.none(),
    onSome: (expression) =>
      Option.match(booleanLiteralValue(expression), {
        onNone: () => Option.none(),
        onSome: (value) => Option.some({ value })
      })
  })
}

const unwrapSingleStatementBlock = (statement: ts.Statement): ts.Statement => {
  if (!ts.isBlock(statement)) {
    return statement
  }

  const hasOneStatement = statement.statements.length === 1

  if (!hasOneStatement) {
    return statement
  }

  return statement.statements[0]
}

const booleanLiteralValue = (expression: ts.Expression): Option.Option<boolean> => {
  const unwrapped = unwrapExpression(expression)

  return Match.value(unwrapped.kind).pipe(
    Match.when(ts.SyntaxKind.TrueKeyword, () => true),
    Match.when(ts.SyntaxKind.FalseKeyword, () => false),
    Match.option
  )
}

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  if (!ts.isParenthesizedExpression(expression)) {
    return expression
  }

  return unwrapExpression(expression.expression)
}

const createMatch = (
  context: RuleContext,
  match: DirectBooleanReturnMatch
): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = match.ifStatement.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: `Avoid returning ${String(match.literalValue)} from a conditional branch.`,
    hint: `Use the condition as the boolean value instead: return ${match.returnExpression}.`
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
