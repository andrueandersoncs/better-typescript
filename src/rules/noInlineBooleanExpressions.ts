import * as path from "node:path"
import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-inline-boolean-expressions"

export const noInlineBooleanExpressions: Rule = {
  id: ruleId,
  description: "Disallow boolean operators inline in an if statement condition.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isIfStatement),
        Stream.map((ifStatement) => unwrapExpression(ifStatement.expression)),
        Stream.filter(isBooleanOperatorExpression),
        Stream.map((expression) => createMatch(context, expression)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const isBooleanOperatorExpression = (expression: ts.Expression): boolean =>
  Option.match(Option.liftPredicate(ts.isBinaryExpression)(expression), {
    onNone: () => false,
    onSome: (expression) => booleanOperatorKinds.has(expression.operatorToken.kind)
  })

const booleanOperatorKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken
])

const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression

const createMatch = (context: RuleContext, expression: ts.Expression): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = expression.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid boolean operators inline in an if statement condition.",
    hint:
      "Extract the expression into a well-named const variable declaration above the if " +
      "statement and use that variable in the if condition."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}
