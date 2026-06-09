import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-for-of-loops"

export const noForOfLoops: Rule = {
  id: ruleId,
  description: "Disallow for..of loops in favor of immutable collection operations.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isForOfStatement),
        Stream.map((forOfStatement) => createMatch(context, forOfStatement)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const createMatch = (context: RuleContext, forOfStatement: ts.ForOfStatement): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = forOfStatement.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid imperative logic in for..of loops.",
    hint:
      "Use immutable collection logic such as Array.prototype.map(), " +
      "Array.prototype.reduce(), Array.prototype.filter(), Array.prototype.flatMap(), " +
      "or Streams for async iterables instead."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
