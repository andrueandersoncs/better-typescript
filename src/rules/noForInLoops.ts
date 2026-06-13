import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-for-in-loops"

const forInMatches = (
  forInStatement: ts.ForInStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {
    ruleId,
    node: forInStatement,
    message: "Avoid imperative logic in for..in loops.",
    hint:
      "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
      "or Record.toEntries(), instead."
  })
]

const check = onNode([ts.SyntaxKind.ForInStatement], ts.isForInStatement, forInMatches)

export const noForInLoops = new Rule({
  id: ruleId,
  description: "Disallow for..in loops in favor of Effect Record operations.",
  check
})
