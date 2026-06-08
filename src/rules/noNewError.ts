import * as path from "node:path"
import * as ts from "typescript"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-new-error"

export const noNewError: Rule = {
  id: ruleId,
  description: "Disallow direct Error construction in favor of Effect Schema tagged errors.",
  check: (context) => {
    const matches: Array<RuleMatch> = []

    visitNewExpressions(context.sourceFile, (newExpression) => {
      if (isBareErrorConstruction(newExpression)) {
        matches.push(createMatch(context, newExpression))
      }
    })

    return matches
  }
}

function visitNewExpressions(
  node: ts.Node,
  onNewExpression: (node: ts.NewExpression) => void
): void {
  if (ts.isNewExpression(node)) {
    onNewExpression(node)
  }

  ts.forEachChild(node, (child) => visitNewExpressions(child, onNewExpression))
}

function isBareErrorConstruction(newExpression: ts.NewExpression): boolean {
  return ts.isIdentifier(newExpression.expression) && newExpression.expression.text === "Error"
}

function createMatch(context: RuleContext, newExpression: ts.NewExpression): RuleMatch {
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

function toRelativeFileName(projectRoot: string, fileName: string): string {
  const relative = path.relative(projectRoot, fileName)
  return relative.length === 0 ? fileName : relative
}
