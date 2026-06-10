import * as path from "node:path"
import type * as ts from "typescript"
import type { RuleContext, RuleMatch } from "./types.js"

export interface RuleMatchSource {
  readonly ruleId: string
  readonly node: ts.Node
  readonly message: string
  readonly hint: string
}

export const createRuleMatch = (context: RuleContext, source: RuleMatchSource): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = source.node.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId: source.ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: source.message,
    hint: source.hint
  }
}

export const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}
