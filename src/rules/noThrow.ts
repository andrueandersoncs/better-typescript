import * as path from "node:path"
import * as ts from "typescript"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-throw"

export const noThrow: Rule = {
  id: ruleId,
  description: "Disallow throw statements in favor of Effect errors.",
  check: (context) => {
    const matches: Array<RuleMatch> = []

    visitThrowStatements(context.sourceFile, (throwStatement) => {
      matches.push(createMatch(context, throwStatement))
    })

    return matches
  }
}

function visitThrowStatements(
  node: ts.Node,
  onThrowStatement: (node: ts.ThrowStatement) => void
): void {
  if (ts.isThrowStatement(node)) {
    onThrowStatement(node)
  }

  ts.forEachChild(node, (child) => visitThrowStatements(child, onThrowStatement))
}

function createMatch(context: RuleContext, throwStatement: ts.ThrowStatement): RuleMatch {
  const sourceFile = context.sourceFile
  const start = throwStatement.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid throwing errors with throw.",
    hint:
      "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
      'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'
  }
}

function toRelativeFileName(projectRoot: string, fileName: string): string {
  const relative = path.relative(projectRoot, fileName)
  return relative.length === 0 ? fileName : relative
}
