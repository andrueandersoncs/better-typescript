import * as path from "node:path"
import type * as ts from "typescript"
import { RuleMatch } from "./types.js"
import type { RuleContext } from "./types.js"

export const createRuleMatch = (
  context: RuleContext,
  source: {
    readonly ruleId: string
    readonly node: ts.Node
    readonly message: string
    readonly hint: string
  }
): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = source.node.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)
  const fileName = toRelativeFileName(context.projectRoot)(sourceFile.fileName)

  return new RuleMatch({
    ruleId: source.ruleId,
    fileName,
    line: location.line + 1,
    column: location.character + 1,
    message: source.message,
    hint: source.hint
  })
}

export const toRelativeFileName = (projectRoot: string) => (fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}
