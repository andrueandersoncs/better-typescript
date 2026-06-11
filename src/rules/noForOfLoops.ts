import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-for-of-loops"

const forOfMatches = (
  forOfStatement: ts.ForOfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {
    ruleId,
    node: forOfStatement,
    message: "Avoid imperative logic in for..of loops.",
    hint:
      "Use immutable collection logic such as Array.prototype.map(), " +
      "Array.prototype.reduce(), Array.prototype.filter(), Array.prototype.flatMap(), " +
      "or Streams for async iterables instead."
  })
]

export const noForOfLoops = new Rule({
  id: ruleId,
  description: "Disallow for..of loops in favor of immutable collection operations.",
  check: onNode([ts.SyntaxKind.ForOfStatement], ts.isForOfStatement, forOfMatches)
})
