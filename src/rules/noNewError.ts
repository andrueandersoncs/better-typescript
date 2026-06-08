import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-new-error"

export const noNewError: Rule = {
  id: ruleId,
  description: "Disallow direct Error construction in favor of Effect Schema tagged errors.",
  check: (context) => {
    return Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isNewExpression),
        Stream.filter(isBareErrorConstruction),
        Stream.map((newExpression) => createMatch(context, newExpression)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
  }
}

const isBareErrorConstruction = (newExpression: ts.NewExpression): boolean => {
  return ts.isIdentifier(newExpression.expression) && newExpression.expression.text === "Error"
}

const createMatch = (context: RuleContext, newExpression: ts.NewExpression): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = newExpression.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid using new Error() directly.",
    hint:
      "Declare a custom error with Effect Schema.TaggedError, then use new CustomError() " +
      "instead of bare new Error()."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)
  return relative.length === 0 ? fileName : relative
}
