import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
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
        Stream.map((ifStatement) => directBooleanReturnMatch(context, ifStatement)),
        Stream.filter(isDefined),
        Stream.map((match) => createMatch(context, match)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const directBooleanReturnMatch = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): DirectBooleanReturnMatch | undefined => {
  const thenReturn = booleanReturnFromStatement(ifStatement.thenStatement)

  if (thenReturn === undefined) {
    return undefined
  }

  const conditionText = ifStatement.expression.getText(context.sourceFile)

  return {
    ifStatement,
    literalValue: thenReturn.value,
    returnExpression: thenReturn.value ? `(${conditionText})` : `!(${conditionText})`
  }
}

const booleanReturnFromStatement = (statement: ts.Statement): BooleanReturn | undefined => {
  const returnStatement =
    ts.isBlock(statement) && statement.statements.length === 1 ? statement.statements[0] : statement

  if (!ts.isReturnStatement(returnStatement) || returnStatement.expression === undefined) {
    return undefined
  }

  const value = booleanLiteralValue(returnStatement.expression)

  return value === undefined ? undefined : { value }
}

const booleanLiteralValue = (expression: ts.Expression): boolean | undefined => {
  const unwrapped = unwrapExpression(expression)

  return unwrapped.kind === ts.SyntaxKind.TrueKeyword
    ? true
    : unwrapped.kind === ts.SyntaxKind.FalseKeyword
      ? false
      : undefined
}

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  let current = expression

  while (ts.isParenthesizedExpression(current)) {
    current = current.expression
  }

  return current
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

const isDefined = <A>(value: A | undefined): value is A => value !== undefined

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)
  return relative.length === 0 ? fileName : relative
}
