import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-implicit-return"

type ArrowFunctionWithBlockBody = ts.ArrowFunction & {
  readonly body: ts.Block
}

export const preferImplicitReturn: Rule = {
  id: ruleId,
  description: "Prefer implicit arrow function returns over block bodies with a single return.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isArrowFunction),
        Stream.filter(hasSingleValueReturnStatement),
        Stream.map((arrowFunction) => createMatch(context, arrowFunction)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const hasSingleValueReturnStatement = (
  arrowFunction: ts.ArrowFunction
): arrowFunction is ArrowFunctionWithBlockBody =>
  ts.isBlock(arrowFunction.body) &&
  arrowFunction.body.statements.length === 1 &&
  isValueReturnStatement(arrowFunction.body.statements[0])

const isValueReturnStatement = (
  statement: ts.Statement
): statement is ts.ReturnStatement & { readonly expression: ts.Expression } =>
  ts.isReturnStatement(statement) && statement.expression !== undefined

const createMatch = (
  context: RuleContext,
  arrowFunction: ArrowFunctionWithBlockBody
): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = arrowFunction.body.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid arrow function block bodies that only return a value.",
    hint:
      "Replace this with an implicit return by removing the return statement and function " +
      "body braces. Wrap object literals in parentheses when needed."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)
  return relative.length === 0 ? fileName : relative
}
