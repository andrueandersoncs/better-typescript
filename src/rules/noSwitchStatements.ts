import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { Rule } from "./types.js"

const ruleId = "no-switch-statements"

export const noSwitchStatements: Rule = {
  id: ruleId,
  description: "Disallow switch statements in favor of Effect Match.",
  check: onNode(
    [ts.SyntaxKind.SwitchStatement],
    ts.isSwitchStatement,
    (switchStatement, context) => [
      createRuleMatch(context, {
        ruleId,
        node: switchStatement,
        message: "Avoid switch statements.",
        hint:
          "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
          "so every case is handled explicitly."
      })
    ]
  )
}
