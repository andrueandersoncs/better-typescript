import * as path from "node:path"
import { Schema } from "effect"
import type * as ts from "typescript"
import { TsNode } from "./tsSchema.js"
import { RuleMatch } from "./types.js"
import type { RuleContext } from "./types.js"

export class MatchSource extends Schema.Class<MatchSource>("MatchSource")({
  ruleId: Schema.String,
  node: TsNode,
  message: Schema.String,
  hint: Schema.String
}) {}

type MatchSourceFields = Pick<
  MatchSource,
  "ruleId" | "node" | "message" | "hint"
>

export const createRuleMatch =
  (context: RuleContext) =>
  (source: MatchSourceFields): RuleMatch => {
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

export const toRelativeFileName =
  (projectRoot: string) =>
  (fileName: string): string => {
    const relative = path.relative(projectRoot, fileName)

    return relative || fileName
  }
