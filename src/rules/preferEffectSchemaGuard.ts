import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { childNodeStream, nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-guard"

export const preferEffectSchemaGuard: Rule = {
  id: ruleId,
  description: "Prefer Effect Schema guards over string-key in-operator checks.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isIfStatement),
        Stream.flatMap((ifStatement) => conditionMatchStream(context, ifStatement.expression)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const conditionMatchStream = (
  context: RuleContext,
  expression: ts.Expression
): Stream.Stream<RuleMatch> =>
  expressionStream(expression).pipe(
    Stream.filter(isStringKeyInExpression),
    Stream.map((match) => createMatch(context, match))
  )

const expressionStream = (expression: ts.Expression): Stream.Stream<ts.Expression> => {
  const unwrapped = unwrapExpression(expression)

  return Stream.succeed(unwrapped).pipe(
    Stream.concat(
      childNodeStream(unwrapped).pipe(
        Stream.filter(ts.isExpression),
        Stream.flatMap(expressionStream)
      )
    )
  )
}

const isStringKeyInExpression = (
  expression: ts.Expression
): expression is ts.BinaryExpression => {
  if (ts.isBinaryExpression(expression)) {
    const isInOperator = expression.operatorToken.kind === ts.SyntaxKind.InKeyword
    const hasStringKey = isStringLiteralLike(unwrapExpression(expression.left))
    const isStringKeyIn = isInOperator && hasStringKey

    return isStringKeyIn
  }

  return false
}

const isStringLiteralLike = (expression: ts.Expression): boolean =>
  ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)

const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression

const createMatch = (context: RuleContext, expression: ts.BinaryExpression): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = expression.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)
  const propertyName = unwrapExpression(expression.left).getText(sourceFile)
  const objectText = expression.right.getText(sourceFile)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: `Avoid using ${propertyName} in ${objectText} as a type guard.`,
    hint: `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}
