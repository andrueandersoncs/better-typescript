import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-switch-statements"

const switchStatementMatches = (
  switchStatement: ts.SwitchStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {
    ruleId,
    node: switchStatement,
    message: "Avoid switch statements.",
    hint:
      "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
      "so every case is handled explicitly."
  })
]

export const noSwitchStatements: Rule = {
  id: ruleId,
  description: "Disallow switch statements in favor of Effect Match.",
  check: onNode([ts.SyntaxKind.SwitchStatement], ts.isSwitchStatement, switchStatementMatches)
}
