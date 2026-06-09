import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-switch-statements"

export const noSwitchStatements: Rule = {
  id: ruleId,
  description: "Disallow switch statements in favor of Effect Match.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isSwitchStatement),
        Stream.map((switchStatement) => createMatch(context, switchStatement)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const createMatch = (
  context: RuleContext,
  switchStatement: ts.SwitchStatement
): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = switchStatement.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid switch statements.",
    hint:
      "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
      "so every case is handled explicitly."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
